import { ApiError, readCatalog, useQuery } from '../api';
import type { Page } from '../api';
import { useAuth } from '../auth';

export type CatalogTemplate = {
  id: number;
  plateTypeId: number | null;
  templateName: string | null;
  imagePreviewUrl: string | null;
  /** Legacy attachment column from the existing API; never required for preview. */
  gcodeFileUrl?: string | null;
  isActive: boolean | null;
};

export type CatalogPlate = {
  id: number;
  typeId: number | null;
  colorId: number | null;
  sku: string | null;
  price: number | null;
  stockQuantity: number | null;
  material: string | null;
  color: string | null;
  colorName: string | null;
  colorCode: string | null;
  typeName: string | null;
  shape: string | null;
  dimensions: string | null;
};

export type CatalogElement = { id: number; templateId: number; staffId: number | null; elementName: string | null; positionX: number | null; positionY: number | null; scale: number | null };

export type CatalogColor = { id: number; colorName: string; colorCode: string; isActive: boolean | null };
export type CatalogType = { id: number; typeName: string | null; shape: string | null; dimensions: string | null };
export type CatalogData = { templates: CatalogTemplate[]; plates: CatalogPlate[]; colors: CatalogColor[]; types: CatalogType[] };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nullableId(value: unknown): value is number | null { return value === null || id(value); }
function nullableText(value: unknown): value is string | null { return value === null || typeof value === 'string'; }
function nullableBoolean(value: unknown): value is boolean | null { return value === null || typeof value === 'boolean'; }
function nullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isTemplate(value: unknown): value is CatalogTemplate {
  return record(value) && id(value.id) && nullableId(value.plateTypeId)
    && nullableText(value.templateName) && nullableText(value.imagePreviewUrl)
    && nullableBoolean(value.isActive);
}

function isElement(value: unknown): value is CatalogElement {
  return record(value) && id(value.id) && id(value.templateId) && nullableId(value.staffId)
    && nullableText(value.elementName)
    && (value.positionX === null || Number.isSafeInteger(value.positionX))
    && (value.positionY === null || Number.isSafeInteger(value.positionY))
    && (value.scale === null || typeof value.scale === 'number' && Number.isFinite(value.scale) && value.scale > 0 && value.scale <= 1_000_000);
}

function isPlate(value: unknown): value is CatalogPlate {
  return record(value) && id(value.id) && nullableId(value.typeId) && nullableId(value.colorId)
    && nullableNumber(value.price) && nullableNumber(value.stockQuantity)
    && (value.stockQuantity === null || Number.isSafeInteger(value.stockQuantity))
    && ['sku', 'material', 'color', 'colorName', 'colorCode', 'typeName', 'shape', 'dimensions'].every(key => nullableText(value[key]));
}

function isColor(value: unknown): value is CatalogColor {
  return record(value) && id(value.id) && typeof value.colorName === 'string'
    && typeof value.colorCode === 'string' && nullableBoolean(value.isActive);
}

function isType(value: unknown): value is CatalogType {
  return record(value) && id(value.id) && nullableText(value.typeName) && nullableText(value.shape) && nullableText(value.dimensions);
}

function isPage(value: unknown, expectedPage: number): value is Page<unknown> {
  return record(value) && Array.isArray(value.items) && value.pageNumber === expectedPage
    && Number.isSafeInteger(value.pageSize) && (value.pageSize as number) > 0 && (value.pageSize as number) <= 100
    && Number.isSafeInteger(value.totalCount) && (value.totalCount as number) >= 0
    && Number.isSafeInteger(value.totalPages) && (value.totalPages as number) >= 0
    && (value.totalPages as number) <= 10_000
    && value.totalPages === Math.ceil((value.totalCount as number) / (value.pageSize as number))
    && value.items.length <= (value.pageSize as number);
}

async function loadRows<T extends { id: number }>(path: string, valid: (value: unknown) => value is T, signal?: AbortSignal): Promise<T[]> {
  const rows: T[] = [];
  const ids = new Set<number>();
  let totalPages = 1;
  for (let pageNumber = 1; pageNumber <= Math.max(1, totalPages); pageNumber++) {
    const page = await readCatalog<unknown>(`${path}?pageNumber=${pageNumber}&pageSize=100`, signal);
    if (!isPage(page, pageNumber)) throw new ApiError(502, 'Thư viện trả về danh sách không hợp lệ. Vui lòng tải lại.');
    if (pageNumber === 1) totalPages = page.totalPages;
    else if (page.totalPages !== totalPages) throw new ApiError(502, 'Thư viện vừa thay đổi. Vui lòng tải lại danh sách.');
    for (const item of page.items) {
      if (!valid(item) || ids.has(item.id)) throw new ApiError(502, 'Thông tin mẫu hoặc dĩa chưa hợp lệ. Vui lòng liên hệ xưởng.');
      ids.add(item.id); rows.push(item);
    }
  }
  return rows;
}

export async function loadTemplates(signal?: AbortSignal): Promise<CatalogTemplate[]> {
  return loadRows('/choco-templates', isTemplate, signal);
}

export async function loadTemplateElements(templateId: number, signal?: AbortSignal): Promise<CatalogElement[]> {
  if (!id(templateId)) throw new ApiError(0, 'Mã mẫu chưa hợp lệ.');
  const elements = await loadRows('/template-elements/by-template/' + templateId, isElement, signal);
  if (elements.some(element => element.templateId !== templateId)) throw new ApiError(502, 'Bố cục trả về không thuộc mẫu đang chọn.');
  return elements;
}

export async function loadCatalog(signal?: AbortSignal): Promise<CatalogData> {
  const [templates, plates, colors, types] = await Promise.all([
    loadTemplates(signal),
    loadRows('/plates', isPlate, signal),
    loadRows('/plate-colors', isColor, signal),
    loadRows('/plate-types', isType, signal),
  ]);
  return { templates, plates, colors, types };
}

export function useCatalog() {
  const { user } = useAuth();
  return useQuery(`studio-catalog:${user?.id ?? 'guest'}`, loadCatalog);
}

/** API media URLs remain data; never accept executable schemes or embedded credentials. */
export function safeAssetUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || !value.trim() || [...value].some(character => character.charCodeAt(0) <= 32 || character === '\\')) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
