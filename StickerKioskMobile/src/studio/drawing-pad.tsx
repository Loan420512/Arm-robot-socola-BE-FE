import { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Point2, StudioStroke } from './design';
import { colors, styles } from '../theme';

type Props = {
  strokes: readonly StudioStroke[];
  live: readonly Point2[];
  size: number;
  rotation: number;
  lineWidth: number;
  onStart: (point: Point2) => void;
  onMove: (point: Point2) => void;
  onEnd: () => void;
  onInteraction: (active: boolean) => void;
};

function present(point: Point2, rotation: number, size: number): Point2 {
  const angle = rotation * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: (point.x * cos - point.y * sin) * size, y: (point.x * sin + point.y * cos) * size };
}

export function DrawingPad(props: Props) {
  const layout = useRef({ width: 1, height: 1 });
  const [width, setWidth] = useState(1);
  const propsRef = useRef(props);
  propsRef.current = props;
  const gesture = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .maxPointers(1)
    .minDistance(0)
    .onBegin((event) => {
      propsRef.current.onInteraction(true);
      const point = pointFrom(event.x, event.y, layout.current, propsRef.current);
      if (point) propsRef.current.onStart(point);
    })
    .onUpdate((event) => {
      const point = pointFrom(event.x, event.y, layout.current, propsRef.current);
      if (point) propsRef.current.onMove(point);
    })
    .onFinalize(() => {
      propsRef.current.onInteraction(false);
      propsRef.current.onEnd();
    }), []);
  const scale = width / 200;
  const live = thin(props.live.map((point) => present(point, props.rotation, props.size)));
  const liveTip = live[live.length - 1];

  return (
    <GestureDetector gesture={gesture}>
    <View
      accessibilityLabel="Bảng vẽ chocolate trên dĩa"
      style={{ flex: 1, backgroundColor: colors.card }}
      onLayout={(event) => {
        layout.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
        setWidth(event.nativeEvent.layout.width);
      }}
    >
      <View style={{ position: 'absolute', left: scale, top: scale, width: 196 * scale, height: 196 * scale, borderRadius: 98 * scale, backgroundColor: '#fffdf8', borderWidth: 1, borderColor: colors.line }} />
      <View style={{ position: 'absolute', left: (100 - 82 * props.size) * scale, top: (100 - 82 * props.size) * scale, width: 164 * props.size * scale, height: 164 * props.size * scale, borderRadius: 82 * props.size * scale, borderWidth: 1, borderColor: colors.caramel }} />
      {props.strokes.map((stroke) => {
        const points = thin(stroke.points);
        return points.slice(1).map((point, index) => {
          const previous = points[index];
          if (!previous) return null;
          return <Segment key={`${stroke.id}-${index}`} from={previous} to={point} scale={scale} thickness={stroke.width * 200 * scale} color={stroke.color} />;
        });
      })}
      {live.slice(1).map((point, index) => {
        const previous = live[index];
        if (!previous) return null;
        return <Segment key={`live-${index}`} from={previous} to={point} scale={scale} thickness={props.lineWidth * 200 * scale} color="#5b2f20" />;
      })}
      {liveTip ? <View style={{ position: 'absolute', left: (100 + liveTip.x * 100) * scale - 6, top: (100 + liveTip.y * 100) * scale - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: '#5b2f20' }} /> : null}
      {width < 2 ? <Text style={styles.meta}> </Text> : null}
    </View>
    </GestureDetector>
  );
}

function thin(points: readonly Point2[], max = 80): Point2[] {
  if (points.length <= max) return [...points];
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, index) => points[Math.round(index * step)] ?? points[0]!);
}

function pointFrom(x: number, y: number, box: { width: number; height: number }, props: Props): Point2 | null {
  const nx = (x / box.width) * 2 - 1;
  const ny = (y / box.height) * 2 - 1;
  if (Math.hypot(nx, ny) > 0.82 * props.size) return null;
  const angle = -props.rotation * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: (nx * cos - ny * sin) / props.size, y: (nx * sin + ny * cos) / props.size };
}

function Segment(props: { from: Point2; to: Point2; scale: number; thickness: number; color: string }) {
  const x1 = (100 + props.from.x * 100) * props.scale;
  const y1 = (100 + props.from.y * 100) * props.scale;
  const x2 = (100 + props.to.x * 100) * props.scale;
  const y2 = (100 + props.to.y * 100) * props.scale;
  const length = Math.max(1, Math.hypot(x2 - x1, y2 - y1));
  const angle = `${Math.atan2(y2 - y1, x2 - x1)}rad`;
  return (
    <View
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - length / 2,
        top: (y1 + y2) / 2 - props.thickness / 2,
        width: length,
        height: props.thickness,
        borderRadius: props.thickness / 2,
        backgroundColor: props.color,
        transform: [{ rotate: angle }],
      }}
    />
  );
}
