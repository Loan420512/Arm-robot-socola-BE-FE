import './webgl-shims';
import { installStudioDom, type PointerSurface } from './dom-shim';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { API_ORIGIN } from '../api-origin';
import { createSourceMachine } from './sourceMachine';
import { buildSourceMotion } from './sourceMotion';

installStudioDom();

export type SceneStroke = {
  id: string;
  points: readonly { x: number; y: number }[];
  color: string;
  width: number;
};

export type SceneOptions = {
  strokes: readonly SceneStroke[];
  plateColor: string;
  view: 'perspective' | 'top';
  progress: number;
  showRobot: boolean;
  resetKey?: number;
  templateImageUrl?: string | null;
  templateScale?: number;
  templateRotation?: number;
};

type Callbacks = {
  ready: () => void;
  error: (message: string) => void;
  robotStatus: (loading: boolean, warning?: string) => void;
  templateError?: (message: string) => void;
  duration?: (seconds: number) => void;
};

type Extrusion = {
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
  segments: number;
  length: number;
};

export type StudioScene = {
  update: (options: SceneOptions) => void;
  resize: () => void;
  dispose: () => void;
};

export type StudioHost = { width: number; height: number; pixelRatio: number; present: () => void };


const PLATE_DIAMETER = 4.3;
const USABLE_RADIUS = 1.55;
const RADIAL_SEGMENTS = 8;
const MODEL_BASE = `${API_ORIGIN}/models/choco/`;

function clamp(value: number, lower: number, upper: number) {
  return Number.isFinite(value) ? Math.min(upper, Math.max(lower, value)) : lower;
}

function color(value: string, fallback: string) {
  return /^#[a-f\d]{6}$/i.test(value) ? value : fallback;
}

/** Release GLTF GPU resources, including ImageBitmaps created by GLTFLoader. */
function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      for (const property of Object.values(material)) {
        if (property instanceof THREE.Texture) textures.add(property);
      }
    }
    if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    texture.dispose();
    const bitmap: unknown = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close();
  }
}

function releaseMaterial(material: THREE.Material) {
  for (const property of Object.values(material)) {
    if (!(property instanceof THREE.Texture)) continue;
    property.dispose();
    const bitmap: unknown = property.source.data;
    if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close();
  }
  material.dispose();
}

/** Fit the supplied model without changing its authored node hierarchy or rig. */
function normalizeModel(model: THREE.Object3D, extent: number, heightOnly = false) {
  const updateRig = () => {
    model.updateMatrixWorld(true);
    model.traverse(node => { if (node instanceof THREE.SkinnedMesh) node.skeleton.update(); });
  };
  updateRig();
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.getSize(new THREE.Vector3());
  const measure = heightOnly ? size.y : Math.max(size.x, size.z);
  if (!Number.isFinite(measure) || measure <= 0) throw new Error('Mô hình không có kích thước hợp lệ.');
  const factor = extent / measure;
  model.scale.multiplyScalar(factor);
  updateRig();
  const scaled = new THREE.Box3().setFromObject(model, true);
  const center = scaled.getCenter(new THREE.Vector3());
  model.position.add(new THREE.Vector3(-center.x, -scaled.min.y, -center.z));
  updateRig();
  return model;
}

export function createStudioScene(host: StudioHost, renderer: THREE.WebGLRenderer, element: PointerSurface, initial: SceneOptions, callbacks: Callbacks): StudioScene {
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  let framesRemaining = 0;
  let options = initial;
  let plate: THREE.Object3D | null = null;
  let extrusions: Extrusion[] = [];
  let motion = buildSourceMotion([]);
  let previousStrokes: readonly SceneStroke[] | null = null;
  let previousPlateColor = '';
  let previousView: SceneOptions['view'] | null = null;
  let previousRobot: boolean | null = null;
  let previousReset: number | undefined;
  const requests = new AbortController();
  const palette = {
    paper: '#efe2ce',
    backdrop: '#f3ecdf',
    cocoa: '#5b2f20',
    rule: '#e0d2ba',
    steel: '#c4a582',
  };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.paper);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = false;
  const controls = new OrbitControls(camera, element as unknown as HTMLElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 30;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI / 2.05;

  scene.add(new THREE.HemisphereLight(palette.backdrop, palette.steel, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(3.5, 9, 5);
  key.castShadow = false;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.4);
  fill.position.set(-4, 5, -4);
  scene.add(fill);

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: palette.paper, roughness: 0.92 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.02;
  table.receiveShadow = true;
  scene.add(table);
  const chocolate = new THREE.Group();
  chocolate.name = 'ChocolatePreview';
  scene.add(chocolate);
  const machine = createSourceMachine(palette.cocoa);
  const tool = machine.group;
  scene.add(tool);
  callbacks.robotStatus(false);

  const raycaster = new THREE.Raycaster();
  const rayOrigin = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const modelLoader = new GLTFLoader();
  let preview: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> | null = null;
  let previewTexture: THREE.Texture | null = null;
  let previewUrl: string | null | undefined;
  let previewRequest = 0;

  function updateTemplateImage() {
    if (!plate) return;
    const url = options.templateImageUrl || null;
    if (previewUrl !== url) {
      previewUrl = url;
      const request = ++previewRequest;
      if (preview) { scene.remove(preview); preview.geometry.dispose(); preview.material.dispose(); preview = null; }
      previewTexture?.dispose(); previewTexture = null;
      callbacks.templateError?.('');
      if (url) {
        new THREE.TextureLoader().load(url, texture => {
          if (disposed || request !== previewRequest) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace;
          previewTexture = texture;
          preview = new THREE.Mesh(new THREE.CircleGeometry(USABLE_RADIUS * 0.82, 96), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
          preview.rotation.x = -Math.PI / 2;
          preview.name = 'ApiTemplateImage';
          scene.add(preview);
          updateTemplateImage();
          requestRender();
        }, undefined, () => {
          if (!disposed && request === previewRequest) callbacks.templateError?.('Không tải được ảnh của mẫu đã chọn. Vui lòng chọn lại mẫu hoặc tải lại thư viện.');
        });
      }
    }
    if (preview) {
      preview.scale.setScalar(clamp(options.templateScale ?? 1, 0.45, 1));
      preview.rotation.z = -(options.templateRotation ?? 0) * Math.PI / 180;
      preview.position.y = Math.max(...[[0, 0], [0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]].map(([x, z]) => surfacePoint(x, z, 0).y)) + 0.012;
    }
  }

  function requestRender() {
    if (disposed || contextLost) return;
    framesRemaining = 24;
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }

  function render() {
    frame = 0;
    if (disposed || contextLost || document.hidden) return;
    try {
      controls.update();
      renderer.render(scene, camera);
      host.present();
    } catch (error) {
      contextLost = true;
      callbacks.error(error instanceof Error ? error.message : 'Không vẽ được không gian 3D.');
      return;
    }
    if (--framesRemaining > 0) frame = requestAnimationFrame(render);
  }

  function frameCamera() {
    const top = options.view === 'top';
    camera.up.set(0, top ? 0 : 1, top ? -1 : 0);
    controls.target.set(0, top ? 0 : 0.35, 0);
    if (top) {
      camera.position.set(0, 6.4, 0.001);
    } else {
      const aspect = Math.max(camera.aspect, 0.35);
      const tanHorizontal = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;
      const distance = 2.35 / tanHorizontal / 0.78;
      const direction = new THREE.Vector3(0.42, 0.78, 0.72).normalize();
      camera.position.copy(controls.target).addScaledVector(direction, distance);
    }
    camera.lookAt(controls.target);
    controls.update();
    requestRender();
  }

  function surfacePoint(x: number, z: number, radius: number) {
    let y = 0.12;
    if (plate) {
      rayOrigin.set(x, 8, z);
      raycaster.set(rayOrigin, down);
      const intersection = raycaster.intersectObject(plate, true)[0];
      if (intersection) y = intersection.point.y;
    }
    return new THREE.Vector3(x, y + radius * 0.7 + 0.006, z);
  }

  function clearExtrusions() {
    for (const extrusion of extrusions) {
      chocolate.remove(extrusion.mesh);
      extrusion.mesh.geometry.dispose();
      extrusion.mesh.material.dispose();
    }
    extrusions = [];
    motion = buildSourceMotion([]);
  }

  function rebuildStrokes() {
    clearExtrusions();
    if (!plate) return;
    for (const stroke of options.strokes) {
      const points: THREE.Vector3[] = [];
      const radius = clamp(stroke.width, 0.004, 0.04) * USABLE_RADIUS;
      for (const point of stroke.points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        const vector = new THREE.Vector2(clamp(point.x, -1, 1), clamp(point.y, -1, 1));
        if (vector.length() > 1) vector.normalize();
        const sampled = surfacePoint(vector.x * USABLE_RADIUS, vector.y * USABLE_RADIUS, radius);
        if (!points.length || sampled.distanceToSquared(points[points.length - 1]) > 0.000001) points.push(sampled);
      }
      if (points.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const length = curve.getLength();
      if (length <= 0) continue;
      const segments = Math.min(600, Math.max(24, points.length * 3));
      const geometry = new THREE.TubeGeometry(curve, segments, radius, RADIAL_SEGMENTS, false);
      const material = new THREE.MeshStandardMaterial({
        color: color(stroke.color, palette.cocoa), roughness: 0.35, metalness: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      chocolate.add(mesh);
      extrusions.push({ curve, mesh, segments, length });
    }
    motion = buildSourceMotion(extrusions);
    callbacks.duration?.(motion.duration);
    updateProgress();
    frameCamera();
  }

  function updateProgress() {
    const progress = clamp(options.progress, 0, 1);
    const sample = motion.sample(progress);
    for (let index = 0; index < extrusions.length; index++) {
      const extrusion = extrusions[index];
      const local = sample.strokeProgress[index] ?? 0;
      extrusion.mesh.visible = local > 0;
      extrusion.mesh.geometry.setDrawRange(0, Math.floor(local * extrusion.segments) * RADIAL_SEGMENTS * 6);
    }
    tool.visible = options.showRobot && options.view !== 'top';
    tool.position.copy(sample.position);
    const current = extrusions[sample.colorIndex];
    if (current) machine.setColor(current.mesh.material.color.getStyle());
    machine.setPhase(sample.phase);
    machine.setProgress(sample.plunger);
    requestRender();
  }

  async function loadModel(filename: string) {
    const response = await fetch(MODEL_BASE + filename, { signal: requests.signal });
    if (!response.ok) throw new Error(`Không tải được mô hình (${response.status}).`);
    const bytes = await response.arrayBuffer();
    if (disposed) return null;
    const gltf = await modelLoader.parseAsync(bytes, MODEL_BASE);
    if (disposed) { disposeObject(gltf.scene); return null; }
    return gltf;
  }

  function prepareMeshes(root: THREE.Object3D) {
    const remove: THREE.Object3D[] = [];
    root.traverse(node => {
      if (node instanceof THREE.Light || node instanceof THREE.Sprite || node instanceof THREE.Points || node instanceof THREE.Camera) remove.push(node);
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = false;
      node.receiveShadow = false;
    });
    for (const node of remove) node.parent?.remove(node);
  }

  function fallbackPlate(hex: string) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.05, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45 }),
    );
    mesh.position.y = 0.06;
    mesh.name = 'FallbackDish';
    return mesh;
  }

  void loadModel('dish.glb').then(gltf => {
    if (!gltf || disposed) return;
    plate = normalizeModel(gltf.scene, PLATE_DIAMETER);
    prepareMeshes(plate);
    const originals = new Set<THREE.Material>();
    plate.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) originals.add(material);
      node.material = new THREE.MeshStandardMaterial({
        color: color(options.plateColor, '#fffefa'), roughness: 0.45, metalness: 0.02,
      });
    });
    originals.forEach(releaseMaterial);
    plate.name = 'SuppliedDish';
    scene.add(plate);
    plate.updateMatrixWorld(true);
    rebuildStrokes();
    updateTemplateImage();
    callbacks.ready();
    requestRender();
  }).catch((error: unknown) => {
    if (!disposed) {
      plate = fallbackPlate(color(options.plateColor, '#fffefa'));
      scene.add(plate);
      callbacks.error(error instanceof Error ? error.message : 'Không tải được mô hình dĩa 3D. Vui lòng thử tải lại.');
      callbacks.ready();
      requestRender();
    }
  });

  function resize() {
    if (disposed) return;
    const apply = () => {
      if (disposed) return;
      const width = Math.max(host.width, 1);
      const height = Math.max(host.height, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const gl = renderer.getContext() as WebGLRenderingContext & { drawingBufferWidth?: number; drawingBufferHeight?: number };
      const pixelWidth = gl.drawingBufferWidth && gl.drawingBufferWidth > 1
        ? gl.drawingBufferWidth
        : Math.max(1, Math.floor(width * Math.max(host.pixelRatio, 1)));
      const pixelHeight = gl.drawingBufferHeight && gl.drawingBufferHeight > 1
        ? gl.drawingBufferHeight
        : Math.max(1, Math.floor(height * Math.max(host.pixelRatio, 1)));
      renderer.setSize(pixelWidth, pixelHeight, false);
      frameCamera();
      requestRender();
    };
    requestAnimationFrame(apply);
  }
  const visibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else requestRender();
  };
  const change = () => requestRender();
  document.addEventListener('visibilitychange', visibility);
  controls.addEventListener('change', change);
  controls.addEventListener('start', change);
  resize();
  frameCamera();

  return {
    resize,
    update(next) {
      if (disposed) return;
      options = next;
      if (previousStrokes !== next.strokes) {
        previousStrokes = next.strokes;
        rebuildStrokes();
      }
      if (plate && previousPlateColor !== next.plateColor) {
        previousPlateColor = next.plateColor;
        plate.traverse(node => {
          if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
            node.material.color.set(color(next.plateColor, '#fffefa'));
          }
        });
      }
      if (previousView !== next.view || previousReset !== next.resetKey || previousRobot !== next.showRobot) {
        previousView = next.view;
        previousReset = next.resetKey;
        previousRobot = next.showRobot;
        frameCamera();
      }
      updateTemplateImage();
      updateProgress();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      requests.abort();
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
      controls.removeEventListener('change', change);
      controls.removeEventListener('start', change);
      controls.dispose();
      clearExtrusions();
      previewTexture?.dispose();
      disposeObject(scene);
      renderer.dispose();
      scene.clear();
    },
  };
}
