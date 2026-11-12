import { Vector3, type CatmullRomCurve3 } from 'three';

export type SourceMotionPhase = 'standby' | 'lowering' | 'extruding' | 'travel' | 'lifting';
export type SourceMotionStroke = { curve: CatmullRomCurve3; length: number };
export type SourceMotionSample = {
  phase: SourceMotionPhase;
  position: Vector3;
  strokeProgress: number[];
  /** Normalized value for SourceMachine.setProgress; the source offset is capped at 0.7. */
  plunger: number;
  colorIndex: number;
};
export type SourceMotion = { duration: number; sample: (progress: number) => SourceMotionSample };

// Timings, heights and easing follow startRoboticPlating() in the supplied
// Threejs/src/main.js. Only contact Y follows the existing plate's surface.
export const SOURCE_RESTING_HEIGHT = 3;
export const SOURCE_HOVER_HEIGHT = 1.5;
export const SOURCE_STROKE_JUMP_HEIGHT = 0.35;
const TIP_CLEARANCE = 0.005;
const MAX_PLUNGER_OFFSET = 0.7;

type Easing = (progress: number) => number;
type Segment = {
  start: number;
  duration: number;
  phase: Exclude<SourceMotionPhase, 'standby'>;
  completedStrokes: number;
  colorIndex: number;
  from: Vector3;
  to: Vector3;
  ease: Easing;
  drawingIndex?: number;
};

const linear: Easing = value => value;
const power2Out: Easing = value => 1 - (1 - value) ** 3;
const power2In: Easing = value => value ** 3;
const power2InOut: Easing = value => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const power1InOut: Easing = value => value < 0.5 ? 2 * value ** 2 : 1 - (-2 * value + 2) ** 2 / 2;
const power3Out: Easing = value => 1 - (1 - value) ** 4;

function boundedProgress(value: number): number {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
}

function contactPoint(stroke: SourceMotionStroke, progress: number): Vector3 {
  const point = stroke.curve.getPointAt(progress);
  if (![point.x, point.y, point.z].every(Number.isFinite)) throw new RangeError('Source motion requires a finite drawing path.');
  // The original nozzle tip is local Y=0; keep it just above the rendered line.
  return point.add(new Vector3(0, TIP_CLEARANCE, 0));
}

function plungerOffset(index: number, progress: number): number {
  return Math.min(MAX_PLUNGER_OFFSET, 0.06 * index + 0.08 * progress) / MAX_PLUNGER_OFFSET;
}

/**
 * Seekable version of the supplied source's lower/draw/lift/travel sequence.
 * It changes only browser scene state and never emits machine commands.
 */
export function buildSourceMotion(strokes: readonly SourceMotionStroke[]): SourceMotion {
  const segments: Segment[] = [];
  let duration = 0;
  if (strokes.some(stroke => !Number.isFinite(stroke.length) || stroke.length < 0)) {
    throw new RangeError('Source motion requires a non-negative finite path length.');
  }
  if (strokes.length === 0) {
    return { duration, sample: () => ({ phase: 'standby', position: new Vector3(0, SOURCE_RESTING_HEIGHT, 0), strokeProgress: [], plunger: 0, colorIndex: -1 }) };
  }

  function add(segment: Omit<Segment, 'start'>) {
    segments.push({ ...segment, start: duration });
    duration += segment.duration;
  }

  const first = contactPoint(strokes[0], 0);
  const firstRest = new Vector3(first.x, SOURCE_RESTING_HEIGHT, first.z);
  const firstHover = new Vector3(first.x, SOURCE_HOVER_HEIGHT, first.z);
  add({ duration: 0.6, phase: 'lowering', completedStrokes: 0, colorIndex: 0, from: firstRest, to: firstHover, ease: power2Out });
  add({ duration: 0.5, phase: 'lowering', completedStrokes: 0, colorIndex: 0, from: firstHover, to: first, ease: power2InOut });

  strokes.forEach((stroke, index) => {
    const start = contactPoint(stroke, 0);
    const end = contactPoint(stroke, 1);
    if (index > 0) {
      const previous = contactPoint(strokes[index - 1], 1);
      const jumpHeight = SOURCE_STROKE_JUMP_HEIGHT;
      const lifted = new Vector3(previous.x, jumpHeight, previous.z);
      const nextHover = new Vector3(start.x, jumpHeight, start.z);
      add({ duration: 0.25, phase: 'travel', completedStrokes: index, colorIndex: index - 1, from: previous, to: lifted, ease: power2Out });
      add({ duration: 0.45, phase: 'travel', completedStrokes: index, colorIndex: index, from: lifted, to: nextHover, ease: power1InOut });
      add({ duration: 0.25, phase: 'lowering', completedStrokes: index, colorIndex: index, from: nextHover, to: start, ease: power2In });
    }

    // The existing renderer supplies real curves with at least two distinct
    // points. The original source uses this duration for its line strokes.
    add({ duration: Math.max(0.6, stroke.length / 1.8), phase: 'extruding', completedStrokes: index, colorIndex: index, from: start, to: end, ease: linear, drawingIndex: index });
  });

  const last = contactPoint(strokes[strokes.length - 1], 1);
  const lastRest = new Vector3(last.x, SOURCE_RESTING_HEIGHT, last.z);
  add({ duration: 0.8, phase: 'lifting', completedStrokes: strokes.length, colorIndex: strokes.length - 1, from: last, to: lastRest, ease: power3Out });

  return {
    duration,
    sample(progress) {
      const normalized = boundedProgress(progress);
      if (normalized >= 1) {
        return { phase: 'standby', position: lastRest.clone(), strokeProgress: strokes.map(() => 1), plunger: plungerOffset(strokes.length - 1, 1), colorIndex: strokes.length - 1 };
      }
      const time = normalized * duration;
      const segment = segments.find(item => time < item.start + item.duration) ?? segments[segments.length - 1];
      const local = boundedProgress((time - segment.start) / segment.duration);
      const strokeProgress: number[] = strokes.map((_, index) => index < segment.completedStrokes ? 1 : 0);
      let position = segment.from.clone().lerp(segment.to, segment.ease(local));
      let plunger = segment.completedStrokes > 0 ? plungerOffset(segment.completedStrokes - 1, 1) : 0;
      if (segment.drawingIndex !== undefined) {
        strokeProgress[segment.drawingIndex] = local;
        position = contactPoint(strokes[segment.drawingIndex], local);
        plunger = plungerOffset(segment.drawingIndex, local);
      }
      return { phase: segment.phase, position, strokeProgress, plunger, colorIndex: segment.colorIndex };
    },
  };
}
