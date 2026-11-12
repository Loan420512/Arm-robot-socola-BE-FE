import { CatmullRomCurve3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildSourceMotion, SOURCE_HOVER_HEIGHT, SOURCE_RESTING_HEIGHT, SOURCE_STROKE_JUMP_HEIGHT } from './sourceMotion';

function line(from: [number, number, number], to: [number, number, number], length?: number) {
  const curve = new CatmullRomCurve3([new Vector3(...from), new Vector3(...to)]);
  return { curve, length: length ?? curve.getLength() };
}

function closePosition(actual: Vector3, expected: Vector3) {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
  expect(actual.z).toBeCloseTo(expected.z, 8);
}

describe('motion from the supplied Three.js machine', () => {
  it('keeps the empty machine at the original resting height without inventing a stroke', () => {
    const motion = buildSourceMotion([]);
    expect(motion.duration).toBe(0);
    expect(motion.sample(0)).toEqual({ phase: 'standby', position: new Vector3(0, 3, 0), strokeProgress: [], plunger: 0, colorIndex: -1 });
  });

  it('uses the original lowering, stroke speed and final lift durations', () => {
    const motion = buildSourceMotion([line([0, 0.1, 0], [1.8, 0.1, 0])]);
    expect(motion.duration).toBeCloseTo(0.6 + 0.5 + 1 + 0.8, 9);
    const short = buildSourceMotion([line([0, 0.1, 0], [0.1, 0.1, 0])]);
    expect(short.duration).toBeCloseTo(0.6 + 0.5 + 0.6 + 0.8, 9);
  });

  it('starts above the first real XY point and draws nothing while lowering', () => {
    const motion = buildSourceMotion([line([0.3, 0.12, -0.4], [0.9, 0.12, -0.4])]);
    const start = motion.sample(0);
    closePosition(start.position, new Vector3(0.3, SOURCE_RESTING_HEIGHT, -0.4));
    expect(start.phase).toBe('lowering');
    expect(start.strokeProgress).toEqual([0]);
    const halfFirstLowering = motion.sample(0.3 / motion.duration);
    closePosition(halfFirstLowering.position, new Vector3(0.3, 3 + (SOURCE_HOVER_HEIGHT - 3) * 0.875, -0.4));
    expect(halfFirstLowering.plunger).toBe(0);
    const hover = motion.sample(0.6 / motion.duration);
    expect(hover.position.y).toBeCloseTo(SOURCE_HOVER_HEIGHT, 8);
    expect(hover.strokeProgress).toEqual([0]);
  });

  it('moves along the actual curve at the plate height while extruding', () => {
    const stroke = line([-0.8, 0.24, 0.1], [1, 0.24, 0.1]);
    const motion = buildSourceMotion([stroke]);
    const sample = motion.sample((1.1 + 0.5) / motion.duration);
    expect(sample.phase).toBe('extruding');
    expect(sample.strokeProgress[0]).toBeCloseTo(0.5, 8);
    closePosition(sample.position, stroke.curve.getPointAt(0.5).add(new Vector3(0, 0.005, 0)));
    expect(sample.plunger).toBeCloseTo(0.04 / 0.7, 8);
    expect(sample.colorIndex).toBe(0);
  });

  it('lifts, travels and lowers between disconnected strokes without drawing a connecting line', () => {
    const first = line([-1, 0.05, 0], [0.8, 0.05, 0], 1.8);
    const second = line([-0.8, 0.05, 0.7], [1, 0.05, 0.7], 1.8);
    const motion = buildSourceMotion([first, second]);
    expect(motion.duration).toBeCloseTo(1.1 + 1 + 0.25 + 0.45 + 0.25 + 1 + 0.8, 9);
    const lift = motion.sample((2.1 + 0.125) / motion.duration);
    expect(lift.phase).toBe('travel');
    expect(lift.position.x).toBeCloseTo(0.8, 8);
    expect(lift.position.y).toBeGreaterThan(0.055);
    expect(lift.strokeProgress).toEqual([1, 0]);
    expect(lift.colorIndex).toBe(0);
    const travel = motion.sample((2.1 + 0.25 + 0.225) / motion.duration);
    expect(travel.phase).toBe('travel');
    closePosition(travel.position, new Vector3(0, SOURCE_STROKE_JUMP_HEIGHT, 0.35));
    expect(travel.strokeProgress).toEqual([1, 0]);
    expect(travel.colorIndex).toBe(1);
    const lowering = motion.sample((2.1 + 0.25 + 0.45 + 0.125) / motion.duration);
    expect(lowering.phase).toBe('lowering');
    expect(lowering.position.x).toBeCloseTo(-0.8, 8);
    expect(lowering.position.z).toBeCloseTo(0.7, 8);
    expect(lowering.strokeProgress).toEqual([1, 0]);
  });

  it('finishes the drawing before raising the same machine back to rest', () => {
    const motion = buildSourceMotion([line([0, 0.15, 0], [1.8, 0.15, 0])]);
    const lifting = motion.sample((2.1 + 0.4) / motion.duration);
    expect(lifting.phase).toBe('lifting');
    expect(lifting.strokeProgress).toEqual([1]);
    expect(lifting.position.y).toBeGreaterThan(0.155);
    const end = motion.sample(1);
    expect(end.phase).toBe('standby');
    closePosition(end.position, new Vector3(1.8, 3, 0));
    expect(end.strokeProgress).toEqual([1]);
    expect(end.plunger).toBeCloseTo(0.08 / 0.7, 8);
  });

  it('seeks deterministically in either direction and returns independent samples', () => {
    const motion = buildSourceMotion([line([0, 0.1, 0], [1.8, 0.1, 0])]);
    const middle = motion.sample(0.5);
    motion.sample(0.95);
    const again = motion.sample(0.5);
    expect(again).toEqual(middle);
    middle.position.y = 99;
    middle.strokeProgress[0] = 99;
    expect(motion.sample(0.5)).toEqual(again);
  });

  it('bounds seek progress and rejects invalid path lengths', () => {
    const stroke = line([0, 0.05, 0], [1, 0.05, 0]);
    const motion = buildSourceMotion([stroke]);
    expect(motion.sample(-1)).toEqual(motion.sample(0));
    expect(motion.sample(Number.NaN)).toEqual(motion.sample(0));
    expect(motion.sample(2)).toEqual(motion.sample(1));
    expect(() => buildSourceMotion([{ ...stroke, length: Infinity }])).toThrow();
    expect(() => buildSourceMotion([{ ...stroke, length: -1 }])).toThrow();
  });

  it('caps the source plunger movement even with many real strokes', () => {
    const strokes = Array.from({ length: 20 }, (_, index) => line([0, 0.1, index * 0.01], [0.1, 0.1, index * 0.01]));
    const motion = buildSourceMotion(strokes);
    expect(motion.sample(1).plunger).toBe(1);
  });
});
