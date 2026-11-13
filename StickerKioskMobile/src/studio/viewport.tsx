import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useMemo, useRef } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { PointerSurface, type PointerLike } from './dom-shim';
import { createStudioScene, type SceneOptions, type StudioScene } from './scene';

type Props = SceneOptions & {
  onDuration: (seconds: number) => void;
  onError: (message: string) => void;
  onTemplateError: (message: string) => void;
  onInteraction: (active: boolean) => void;
};

function pointer(type: string, x: number, y: number, pointerId = 1): PointerLike {
  return {
    type,
    pointerId,
    pointerType: 'touch',
    button: 0,
    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    preventDefault() { /* OrbitControls calls this on wheel events. */ },
    stopPropagation() { /* OrbitControls calls this on wheel events. */ },
  };
}

export function StudioViewport(props: Props) {
  const surface = useRef(new PointerSurface());
  const host = useRef({ width: 1, height: 1, pixelRatio: PixelRatio.get(), present: () => {} });
  const studio = useRef<StudioScene | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const pinch = useRef(1);
  const send = useRef((type: string, x: number, y: number) => {
    try {
      surface.current.dispatch(pointer(type, x, y));
    } catch {
      /* OrbitControls can reject a partial touch. Keep the screen open. */
    }
  });
  const zoomBy = useRef((deltaY: number) => {
    surface.current.dispatch({ ...pointer('wheel', host.current.width / 2, host.current.height / 2), deltaY, deltaMode: 0 });
  });
  const mark = useRef((active: boolean) => latest.current.onInteraction(active));

  useEffect(() => {
    studio.current?.update(latest.current);
  });

  const gesture = useMemo(() => {
    const drag = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .onBegin((event) => {
        mark.current(true);
        send.current('pointerdown', event.x, event.y);
      })
      .onUpdate((event) => {
        send.current('pointermove', event.x, event.y);
      })
      .onFinalize((event) => {
        send.current('pointerup', event.x, event.y);
        mark.current(false);
      });
    const zoom = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        pinch.current = 1;
        mark.current(true);
      })
      .onUpdate((event) => {
        const delta = (pinch.current - event.scale) * 180;
        pinch.current = event.scale;
        zoomBy.current(delta);
      })
      .onFinalize(() => mark.current(false));
    return Gesture.Simultaneous(drag, zoom);
  }, []);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.stage}
        onLayout={(event) => {
          host.current.width = event.nativeEvent.layout.width;
          host.current.height = event.nativeEvent.layout.height;
          host.current.pixelRatio = PixelRatio.get();
          surface.current.clientWidth = host.current.width;
          surface.current.clientHeight = host.current.height;
          studio.current?.resize();
        }}
      >
        <GLView
          style={StyleSheet.absoluteFill}
          onContextCreate={(gl) => {
            try {
              const renderer = createRenderer(gl);
              host.current.present = () => gl.endFrameEXP();
              studio.current?.dispose();
              studio.current = createStudioScene(host.current, renderer, surface.current, latest.current, {
                ready() { /* The dish model finished loading. */ },
                error(message) { latest.current.onError(message); },
                robotStatus() { /* The phone builds the dispenser from the same geometry, so it is ready immediately. */ },
                templateError(message) { latest.current.onTemplateError(message); },
                duration(seconds) { latest.current.onDuration(seconds); },
              });
            } catch (error) {
              latest.current.onError(error instanceof Error ? error.message : 'Không mở được không gian 3D.');
            }
          }}
        />
      </View>
    </GestureDetector>
  );
}

function createRenderer(gl: ExpoWebGLRenderingContext) {
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    addEventListener() { /* Three expects a DOM canvas. */ },
    removeEventListener() { /* Three expects a DOM canvas. */ },
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
  };
  const root = globalThis as { WebGLRenderingContext?: unknown };
  const previous = root.WebGLRenderingContext;
  root.WebGLRenderingContext = undefined;
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGL2RenderingContext,
      antialias: false,
    });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
    return renderer;
  } finally {
    root.WebGLRenderingContext = previous;
  }
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden', backgroundColor: '#efe2ce' },
});
