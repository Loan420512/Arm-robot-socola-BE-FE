import type { StudioStroke } from './design';

const CENTER = 100;
const PLATE_SPAN = 100;
const PEN_DOWN = 2;
const MAX_STROKES = 30;

/** Same preview G-code the website uses: a 200 mm square, plate center at X100 Y100. */
export function strokesFromGcodeText(source: string): StudioStroke[] {
  const strokes: StudioStroke[] = [];
  let points: StudioStroke['points'] = [];
  let drawing = false;
  const finish = () => {
    if (points.length >= 2 && strokes.length < MAX_STROKES) {
      strokes.push({ id: `preview-${strokes.length + 1}`, points, color: '#5b2f20', width: 0.012 });
    }
    points = [];
    drawing = false;
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.split(';', 1)[0]?.trim() ?? '';
    if (!line) continue;
    const parts = line.split(/\s+/);
    const command = parts[0]?.toUpperCase();
    const words: Record<string, number> = {};
    for (const part of parts.slice(1)) {
      const key = part[0]?.toUpperCase();
      const value = Number(part.slice(1));
      if (key && Number.isFinite(value)) words[key] = value;
    }
    if (command === 'G0' && (words.Z ?? 0) >= PEN_DOWN) finish();
    else if (command === 'G1' && words.Z !== undefined && words.Z < PEN_DOWN) drawing = true;
    else if (command === 'G1' && drawing && words.X !== undefined && words.Y !== undefined) {
      const point = { x: (words.X - CENTER) / PLATE_SPAN, y: (CENTER - words.Y) / PLATE_SPAN };
      if (Math.hypot(point.x, point.y) <= 0.9) points.push(point);
    }
  }
  finish();
  return strokes;
}
