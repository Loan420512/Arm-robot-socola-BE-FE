export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'Q'; x: number; y: number; x1: number; y1: number }
  | { type: 'C'; x: number; y: number; x1: number; y1: number; x2: number; y2: number }
  | { type: 'Z' };

export type Font = {
  charToGlyphIndex: (character: string) => number;
  charToGlyph: (character: string) => {
    getPath: (x: number, y: number, size: number, options: undefined, font: Font) => { commands: PathCommand[] };
    advanceWidth?: number;
  };
  unitsPerEm: number;
};
