export type Point2 = { x: number; y: number };
export type StudioStroke = { id: string; points: Point2[]; color: string; width: number };
export type StudioDraft = {
  version: 2;
  templateId: number | null;
  plateId: number | null;
  size: number;
  rotation: number;
  lineWidth: number;
  strokes: StudioStroke[];
};
export const DRAFT_KEY = 'chocorobot.studio.draft.v2';
export const MAX_STROKES = 30;
export const MAX_POINTS = 500;
export const DESIGN_RADIUS = 0.82;
export const MIN_LINE_WIDTH = 0.006;
export const MAX_LINE_WIDTH = 0.025;
const MAX_STORED_CHARACTERS = 1_000_000;
let sessionDraft: string | null = null;
// A drawing-tool ink, not a chocolate product or catalog option.
const DEFAULT_INK = '#5b2f20';
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function finite(value: unknown, fallback: number, min: number, max: number): number { return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback; }
function id(value: unknown): number | null { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null; }
function color(value: unknown): string { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_INK; }
export function createDraft(): StudioDraft { return { version: 2, templateId: null, plateId: null, size: .85, rotation: 0, lineWidth: .012, strokes: [] }; }
function boundedPoint(point: Point2): Point2 {
  const largest = Math.max(Math.abs(point.x), Math.abs(point.y));
  if (largest === 0) return { x: 0, y: 0 };
  const x = point.x / largest; const y = point.y / largest; const length = Math.hypot(x, y);
  return largest > DESIGN_RADIUS / length ? { x: x / length * DESIGN_RADIUS, y: y / length * DESIGN_RADIUS } : { x: point.x, y: point.y };
}
function cleanPoints(value: unknown): Point2[] {
  if (!Array.isArray(value)) return [];
  const points: Point2[] = []; const count = Math.min(MAX_POINTS, value.length);
  for (let i = 0; i < count; i++) {
    const source: unknown = value[count === 1 ? 0 : Math.round(i * (value.length - 1) / (count - 1))];
    if (!object(source) || typeof source.x !== 'number' || typeof source.y !== 'number' || !Number.isFinite(source.x) || !Number.isFinite(source.y)) continue;
    const point = boundedPoint({ x: source.x, y: source.y }); const previous = points[points.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > .00001) points.push(point);
  }
  return points;
}
export function normalizeDraft(value: unknown): StudioDraft {
  const defaults = createDraft(); if (!object(value) || value.version !== 2) return defaults;
  const strokes: StudioStroke[] = [];
  for (const item of Array.isArray(value.strokes) ? value.strokes.slice(0, MAX_STROKES) : []) {
    if (!object(item)) continue; const points = cleanPoints(item.points); if (points.length < 2) continue;
    strokes.push({ id: 'manual-' + (strokes.length + 1), points, color: color(item.color), width: finite(item.width, defaults.lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH) });
  }
  return { version: 2, templateId: id(value.templateId), plateId: id(value.plateId), size: finite(value.size, defaults.size, .45, 1), rotation: finite(value.rotation, 0, -180, 180), lineWidth: finite(value.lineWidth, defaults.lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH), strokes };
}
/** Only user-created strokes. No generated catalog patterns or inferred paths from template names. */
export function buildStrokes(value: StudioDraft): StudioStroke[] {
  const draft = normalizeDraft(value); const angle = draft.rotation * Math.PI / 180; const cos = Math.cos(angle); const sin = Math.sin(angle);
  return draft.strokes.map(stroke => ({ ...stroke, points: stroke.points.map(point => ({ x: (point.x * cos - point.y * sin) * draft.size, y: (point.x * sin + point.y * cos) * draft.size })) }));
}
export function appendStroke(value: StudioDraft, points: readonly Point2[], ink = DEFAULT_INK): StudioDraft {
  const draft = normalizeDraft(value); const cleaned = cleanPoints(points);
  if (draft.strokes.length >= MAX_STROKES || cleaned.length < 2) return draft;
  return { ...draft, templateId: null, strokes: [...draft.strokes, { id: 'manual-' + (draft.strokes.length + 1), points: cleaned, color: color(ink), width: draft.lineWidth }] };
}
export function undoStroke(value: StudioDraft): StudioDraft { const draft = normalizeDraft(value); return { ...draft, strokes: draft.strokes.slice(0, -1) }; }
export function clearStrokes(value: StudioDraft): StudioDraft { return { ...normalizeDraft(value), strokes: [] }; }
/** Store user choices and API IDs only. Never persist names, prices, stock or server records as fallback data. */
export function saveDraft(value: StudioDraft): boolean {
  try { const serialized = JSON.stringify(normalizeDraft(value)); if (serialized.length > MAX_STORED_CHARACTERS) return false; sessionDraft = serialized; return true; } catch { return false; }
}
export function readDraft(): StudioDraft {
  try { const raw = sessionDraft; if (raw === null || raw.length > MAX_STORED_CHARACTERS) return createDraft(); return normalizeDraft(JSON.parse(raw)); } catch { return createDraft(); }
}
