import './webgl-shims';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import type { AssetPose, BackPoint } from '../../StickerKiosk/src/kiosk/sheet';
import { backToWorld, normalizeRotation, poseRows, stickerCovers, worldToBack } from '../../StickerKiosk/src/kiosk/sheet';

export interface StageSticker {
  readonly key: string;
  readonly imageUrl: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly at: BackPoint;
  readonly rotationDeg: number;
  readonly active: boolean;
}

interface Props {
  readonly caseUrl: string;
  readonly pose: AssetPose;
  readonly sheetWidthMm: number;
  readonly sheetHeightMm: number;
  readonly placements: readonly StageSticker[];
  readonly editable: boolean;
  readonly onSelect: (key: string) => void;
  readonly onMove: (key: string, at: BackPoint) => void;
  readonly onRotate: (key: string, rotationDeg: number) => void;
}

export function CaseView(props: Props) {
  const latest = useRef(props);
  latest.current = props;
  const size = useRef({ width: 1, height: 1 });
  const pick = useRef<((x: number, y: number) => { kind: 'spin' | 'move' | 'orbit'; key?: string; at?: BackPoint } | null) | null>(null);
  const drag = useRef<{ kind: 'spin' | 'move' | 'orbit'; key?: string; lastX: number; lastY: number } | null>(null);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const hit = pick.current?.(event.nativeEvent.locationX, event.nativeEvent.locationY);
        drag.current = {
          kind: hit?.kind ?? 'orbit',
          key: hit?.key,
          lastX: event.nativeEvent.locationX,
          lastY: event.nativeEvent.locationY,
        };
        if (hit?.kind === 'move' && hit.key) latest.current.onSelect(hit.key);
      },
      onPanResponderMove: (event) => {
        const current = drag.current;
        if (!current) return;
        const x = event.nativeEvent.locationX;
        const y = event.nativeEvent.locationY;
        const hit = pick.current?.(x, y);
        if (current.kind === 'move' && current.key && hit?.at) latest.current.onMove(current.key, hit.at);
        if (current.kind === 'spin' && current.key) {
          const placed = latest.current.placements.find((item) => item.key === current.key);
          if (placed && hit?.at) {
            const center = backToWorld(placed.at, { widthMm: latest.current.sheetWidthMm, heightMm: latest.current.sheetHeightMm });
            const world = backToWorld(hit.at, { widthMm: latest.current.sheetWidthMm, heightMm: latest.current.sheetHeightMm });
            const deg = normalizeRotation((Math.atan2(world.x - center.x, world.y - center.y) * 180) / Math.PI);
            latest.current.onRotate(current.key, deg);
          }
        }
        drag.current = { ...current, lastX: x, lastY: y };
      },
      onPanResponderRelease: () => {
        drag.current = null;
      },
    }),
  ).current;

  return (
    <View style={styles.wrap} {...pan.panHandlers}>
      <GLView
        style={StyleSheet.absoluteFill}
        onLayout={(event) => {
          size.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
        }}
        onContextCreate={(gl) => {
          void mount(gl, latest, size, pick, drag);
        }}
      />
    </View>
  );
}

function createRenderer(gl: ExpoWebGLRenderingContext, canvas: object) {
  const root = globalThis as { WebGLRenderingContext?: unknown };
  const previous = root.WebGLRenderingContext;
  // The native context implements WebGL 2, but it still inherits WebGLRenderingContext.
  // Three.js r163 refuses that inheritance before it looks at the methods.
  root.WebGLRenderingContext = undefined;
  try {
    return new THREE.WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGL2RenderingContext,
      antialias: true,
    });
  } finally {
    root.WebGLRenderingContext = previous;
  }
}

async function mount(
  gl: ExpoWebGLRenderingContext,
  latest: { current: Props },
  size: { current: { width: number; height: number } },
  pick: { current: ((x: number, y: number) => { kind: 'spin' | 'move' | 'orbit'; key?: string; at?: BackPoint } | null) | null },
  drag: { current: { kind: 'spin' | 'move' | 'orbit'; key?: string; lastX: number; lastY: number } | null },
) {
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    addEventListener() {},
    removeEventListener() {},
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
  };
  const renderer = createRenderer(gl, canvas);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.setClearColor(0xd7dbd4, 1);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.4);
  key.position.set(80, 160, 220);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, gl.drawingBufferWidth / gl.drawingBufferHeight, 1, 4000);
  let theta = 0.35;
  let phi = 1.15;
  let radius = 280;
  const decals = new THREE.Group();
  scene.add(decals);
  let caseObject: THREE.Object3D | null = null;
  let meshes: THREE.Mesh[] = [];
  let loadedUrl = '';
  let stickerKey = '';
  let alive = true;

  const loader = new GLTFLoader();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function aim() {
    camera.position.set(Math.sin(phi) * Math.sin(theta) * radius, Math.cos(phi) * radius, Math.sin(phi) * Math.cos(theta) * radius);
    camera.lookAt(0, 0, 0);
  }

  function sheet() {
    return { widthMm: latest.current.sheetWidthMm, heightMm: latest.current.sheetHeightMm, mask: { cols: 1, rows: 1, bits: new Uint8Array(1) } };
  }

  pick.current = (x, y) => {
    const view = size.current;
    pointer.set((x / view.width) * 2 - 1, -(y / view.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    const point = hits[0]?.point;
    if (!point) return { kind: 'orbit' };
    const at = worldToBack(point.x, point.y, sheet());
    const props = latest.current;
    for (let index = props.placements.length - 1; index >= 0; index -= 1) {
      const item = props.placements[index]!;
      const center = backToWorld(item.at, sheet());
      const rad = (normalizeRotation(item.rotationDeg) * Math.PI) / 180;
      const knobX = center.x + Math.sin(rad) * (item.heightMm / 2 + 14);
      const knobY = center.y + Math.cos(rad) * (item.heightMm / 2 + 14);
      if (Math.hypot(point.x - knobX, point.y - knobY) < 12 && item.active) return { kind: 'spin', key: item.key, at };
      if (stickerCovers(point.x, point.y, item.at, item, sheet(), item.rotationDeg)) return { kind: 'move', key: item.key, at };
    }
    return { kind: 'orbit', at };
  };

  async function ensureCase() {
    const url = latest.current.caseUrl;
    if (!url || url === loadedUrl) return;
    loadedUrl = url;
    if (caseObject) scene.remove(caseObject);
    const gltf = await loader.loadAsync(url);
    if (!alive || loadedUrl !== url) return;
    const source = gltf.scene;
    const turn = new THREE.Group();
    turn.add(source);
    const [right, up, back] = poseRows(latest.current.pose);
    turn.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
      right[0], right[1], right[2], 0,
      up[0], up[1], up[2], 0,
      back[0], back[1], back[2], 0,
      0, 0, 0, 1,
    ));
    turn.updateMatrixWorld(true);
    const raw = new THREE.Box3().setFromObject(turn, true);
    const rawSize = raw.getSize(new THREE.Vector3());
    turn.position.copy(raw.getCenter(new THREE.Vector3())).negate();
    const outer = new THREE.Group();
    outer.add(turn);
    const basis = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
    outer.scale.setScalar(latest.current.sheetHeightMm / basis);
    scene.add(outer);
    caseObject = outer;
    meshes = [];
    outer.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) meshes.push(mesh);
    });
    const fitted = new THREE.Box3().setFromObject(outer, true);
    radius = Math.max(fitted.getSize(new THREE.Vector3()).length(), 80) * 1.15;
    stickerKey = '';
  }

  async function ensureStickers() {
    const props = latest.current;
    const key = props.placements.map((item) => `${item.key}:${item.at.x},${item.at.y}:${item.rotationDeg}:${item.imageUrl}`).join('|');
    if (key === stickerKey || meshes.length === 0) return;
    stickerKey = key;
    for (const child of [...decals.children]) {
      decals.remove(child);
      (child as THREE.Mesh).geometry?.dispose();
    }
    const backSheet = sheet();
    for (const [index, placement] of props.placements.entries()) {
      const texture = await new THREE.TextureLoader().loadAsync(placement.imageUrl).catch(() => null);
      if (!alive || stickerKey !== key) return;
      if (texture) texture.colorSpace = THREE.SRGBColorSpace;
      const center = backToWorld(placement.at, backSheet);
      const z = meshes.length ? new THREE.Box3().setFromObject(caseObject!, true).max.z : 0;
      const position = new THREE.Vector3(center.x, center.y, z);
      const rad = THREE.MathUtils.degToRad(placement.rotationDeg);
      const orientation = new THREE.Euler(0, 0, -rad);
      const decalSize = new THREE.Vector3(placement.widthMm, placement.heightMm, 20);
      const material = new THREE.MeshBasicMaterial({
        map: texture ?? undefined,
        color: texture ? 0xffffff : 0xdce4d2,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4 - index * 2,
      });
      for (const mesh of meshes) {
        const geometry = new DecalGeometry(mesh, position, orientation, decalSize);
        if (!geometry.getAttribute('position')?.count) {
          geometry.dispose();
          continue;
        }
        const sticker = new THREE.Mesh(geometry, material);
        sticker.renderOrder = index + 1;
        decals.add(sticker);
      }
    }
  }

  aim();
  const clock = { id: 0 };
  let orbitSample = { x: 0, y: 0, ready: false };
  const loopWithOrbit = () => {
    if (!alive) return;
    clock.id = requestAnimationFrame(loopWithOrbit);
    const orbiting = drag.current;
    if (orbiting?.kind === 'orbit') {
      if (!orbitSample.ready) orbitSample = { x: orbiting.lastX, y: orbiting.lastY, ready: true };
      theta -= (orbiting.lastX - orbitSample.x) * 0.01;
      phi = Math.min(2.8, Math.max(0.25, phi + (orbiting.lastY - orbitSample.y) * 0.01));
      orbitSample = { x: orbiting.lastX, y: orbiting.lastY, ready: true };
    } else {
      orbitSample.ready = false;
    }
    void ensureCase().then(() => ensureStickers()).catch(() => undefined);
    aim();
    renderer.render(scene, camera);
    gl.endFrameEXP();
  };
  loopWithOrbit();

  // Patch orbit into the loop by reading a global on the gl object.
  (gl as ExpoWebGLRenderingContext & { __stop?: () => void }).__stop = () => {
    alive = false;
    cancelAnimationFrame(clock.id);
  };
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#d7dbd4' },
});
