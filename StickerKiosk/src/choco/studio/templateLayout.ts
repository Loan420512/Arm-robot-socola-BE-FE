import type { Font, PathCommand } from 'opentype.js';
import latinUrl from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-400-normal.woff?url';
import latinExtendedUrl from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-ext-400-normal.woff?url';
import vietnameseUrl from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-400-normal.woff?url';
import { ApiError } from '../api';
import { loadTemplateElements, type CatalogElement } from './catalog';
import type { Point2, StudioStroke } from './design';

const FRAME_SIZE = 200;
const FONT_SIZE = 14;
const MAX_POINTS = 20_000;
let fontCache: Promise<Font[]> | null = null;
function invalid(message: string): never { throw new ApiError(422, message); }
function loadFonts(): Promise<Font[]> {
  if (!fontCache) {
    fontCache = import('opentype.js').then(({ parse }) => Promise.all([latinUrl, latinExtendedUrl, vietnameseUrl].map(async url => {
      const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new ApiError(response.status, 'Chưa tải được font để dựng nội dung mẫu.');
      return parse(await response.arrayBuffer());
    }))).catch(error => { fontCache = null; throw error; });
  }
  return fontCache;
}

function outlinePaths(commands: PathCommand[]): Point2[][] {
  const paths: Point2[][] = []; let points: Point2[] = []; let cursor: Point2 = { x: 0, y: 0 };
  const append = (point: Point2) => { if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) invalid('Nét chữ chưa hợp lệ.'); const last = points.at(-1); if (!last || Math.hypot(last.x-point.x,last.y-point.y) > .00001) points.push(point); cursor = point; };
  const flush = () => { if (points.length > 1) paths.push(points); points = []; };
  for (const command of commands) {
    if (command.type === 'M') { flush(); append({x:command.x,y:command.y}); }
    else if (command.type === 'L') append({x:command.x,y:command.y});
    else if (command.type === 'Q' || command.type === 'C') {
      const from = cursor; const steps = 12;
      for (let i=1;i<=steps;i++) { const t=i/steps; const u=1-t;
        append(command.type==='Q' ? { x:u*u*from.x+2*u*t*command.x1+t*t*command.x, y:u*u*from.y+2*u*t*command.y1+t*t*command.y } : { x:u*u*u*from.x+3*u*u*t*command.x1+3*u*t*t*command.x2+t*t*t*command.x, y:u*u*u*from.y+3*u*u*t*command.y1+3*u*t*t*command.y2+t*t*t*command.y });
      }
    } else if (command.type==='Z') { const first=points[0]; if(first)append({...first}); flush(); }
  }
  flush(); return paths;
}

/** Interpret each element_name as literal text, never as a preset or a machine instruction. */
export function buildElementStrokes(elements: readonly CatalogElement[], fonts: readonly Font[]): StudioStroke[] {
  if (elements.length > 32) invalid('Bố cục có quá nhiều thành phần để xem thử.');
  const strokes: StudioStroke[] = []; let totalPoints = 0;
  for (const element of elements) {
    const text = element.elementName?.trim().normalize('NFC');
    if (!text || [...text].length > 150 || [...text].some(c => c.charCodeAt(0)<32)) invalid('Nội dung thành phần mẫu chưa hợp lệ.');
    if (element.positionX === null || element.positionY === null || !Number.isSafeInteger(element.positionX) || !Number.isSafeInteger(element.positionY) || element.positionX<0 || element.positionX>FRAME_SIZE || element.positionY<0 || element.positionY>FRAME_SIZE || element.scale === null || !Number.isFinite(element.scale) || element.scale<=0 || element.scale>100) invalid('Vị trí hoặc tỉ lệ thành phần nằm ngoài khung bố cục 200×200.');
    const size = FONT_SIZE*element.scale; let pen = 0; const commands: PathCommand[] = [];
    for (const character of text) {
      const font = fonts.find(candidate => candidate.charToGlyphIndex(character)>0);
      if (!font) invalid('Font xem thử chưa hỗ trợ ký tự trong nội dung mẫu.');
      const glyph = font.charToGlyph(character);
      commands.push(...glyph.getPath(pen,0,size,undefined,font).commands);
      pen += (glyph.advanceWidth??font.unitsPerEm)*size/font.unitsPerEm;
    }
    const paths=outlinePaths(commands); const points=paths.flat(); if(!points.length)invalid('Thành phần chưa có nét chữ để xem thử.');
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const point of points){minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}
    const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
    for (const path of paths) {
      const normalized = path.map(point=>({x:(element.positionX!+point.x-centerX-100)/100,y:(element.positionY!+point.y-centerY-100)/100}));
      if(normalized.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y)||Math.hypot(point.x,point.y)>.82))invalid('Nội dung nằm ngoài vùng dĩa. Cần điều chỉnh vị trí hoặc tỉ lệ của thành phần.');
      totalPoints += normalized.length; if(totalPoints>MAX_POINTS||strokes.length>=500)invalid('Bố cục quá phức tạp để xem thử.');
      strokes.push({id:'element-'+element.id+'-'+strokes.length,points:normalized,width:.006,color:'#5b2f20'});
    }
  }
  return strokes;
}

export async function loadTemplateLayout(templateId: number, signal?: AbortSignal): Promise<{elements:CatalogElement[];strokes:StudioStroke[]}> {
  const elements = await loadTemplateElements(templateId, signal);
  if(signal?.aborted)throw new DOMException('Yêu cầu đã hủy.','AbortError');
  if(!elements.length)return {elements,strokes:[]};
  const fonts = await loadFonts();
  if(signal?.aborted)throw new DOMException('Yêu cầu đã hủy.','AbortError');
  return {elements,strokes:buildElementStrokes(elements,fonts)};
}
