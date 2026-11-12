import { useCallback, useEffect, useState } from 'react';
import { ApiError, request } from './api';

export type CatalogTemplate = {
  id: number;
  plateTypeId: number | null;
  templateName: string | null;
  imagePreviewUrl: string | null;
  isActive: boolean | null;
};

export type CatalogPlate = {
  id: number;
  typeId: number | null;
  colorId: number | null;
  sku: string | null;
  price: number | null;
  stockQuantity: number | null;
  colorName: string | null;
  colorCode: string | null;
  typeName: string | null;
};

export type CatalogColor = { id: number; colorName: string; colorCode: string; isActive: boolean | null };
export type CatalogType = { id: number; typeName: string | null; shape: string | null; dimensions: string | null };
export type CatalogData = { templates: CatalogTemplate[]; plates: CatalogPlate[]; colors: CatalogColor[]; types: CatalogType[] };

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: CatalogData }
  | { status: 'error'; message: string };

type Page = {
  items: unknown[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nullableId(value: unknown): boolean {
  return value === null || id(value);
}

function nullableText(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isPage(value: unknown, expectedPage: number): value is Page {
  return record(value) && Array.isArray(value.items) && value.pageNumber === expectedPage
    && Number.isSafeInteger(value.pageSize) && (value.pageSize as number) > 0 && (value.pageSize as number) <= 100
    && Number.isSafeInteger(value.totalCount) && (value.totalCount as number) >= 0
    && Number.isSafeInteger(value.totalPages) && (value.totalPages as number) >= 0
    && value.totalPages === Math.ceil((value.totalCount as number) / (value.pageSize as number));
}

async function loadRows(path: string, signal: AbortSignal): Promise<unknown[]> {
  const rows: unknown[] = [];
  let totalPages = 1;
  for (let pageNumber = 1; pageNumber <= Math.max(1, totalPages); pageNumber += 1) {
    if (signal.aborted) throw new ApiError(0, 'Yêu cầu đã được hủy.');
    const page = await request<unknown>(`${path}?pageNumber=${pageNumber}&pageSize=100`);
    if (!isPage(page, pageNumber)) throw new ApiError(502, 'Thư viện trả về danh sách không hợp lệ. Vui lòng tải lại.');
    if (pageNumber === 1) totalPages = page.totalPages;
    else if (page.totalPages !== totalPages) throw new ApiError(502, 'Thư viện vừa thay đổi. Vui lòng tải lại danh sách.');
    rows.push(...page.items);
  }
  return rows;
}

function templateOf(value: unknown): CatalogTemplate {
  if (!record(value) || !id(value.id) || !nullableId(value.plateTypeId) || !nullableText(value.templateName) || !nullableText(value.imagePreviewUrl)
    || !(value.isActive === null || typeof value.isActive === 'boolean')) {
    throw new ApiError(502, 'Thông tin mẫu chưa hợp lệ. Vui lòng liên hệ xưởng.');
  }
  return {
    id: value.id,
    plateTypeId: value.plateTypeId as number | null,
    templateName: value.templateName as string | null,
    imagePreviewUrl: value.imagePreviewUrl as string | null,
    isActive: value.isActive as boolean | null,
  };
}

function plateOf(value: unknown): CatalogPlate {
  if (!record(value) || !id(value.id) || !nullableId(value.typeId) || !nullableId(value.colorId)
    || !(value.price === null || typeof value.price === 'number')
    || !(value.stockQuantity === null || (typeof value.stockQuantity === 'number' && Number.isSafeInteger(value.stockQuantity)))) {
    throw new ApiError(502, 'Thông tin dĩa chưa hợp lệ. Vui lòng liên hệ xưởng.');
  }
  return {
    id: value.id,
    typeId: value.typeId as number | null,
    colorId: value.colorId as number | null,
    sku: typeof value.sku === 'string' ? value.sku : null,
    price: value.price as number | null,
    stockQuantity: value.stockQuantity as number | null,
    colorName: typeof value.colorName === 'string' ? value.colorName : null,
    colorCode: typeof value.colorCode === 'string' ? value.colorCode : null,
    typeName: typeof value.typeName === 'string' ? value.typeName : null,
  };
}

function colorOf(value: unknown): CatalogColor {
  if (!record(value) || !id(value.id) || typeof value.colorName !== 'string' || typeof value.colorCode !== 'string') {
    throw new ApiError(502, 'Thông tin màu dĩa chưa hợp lệ. Vui lòng liên hệ xưởng.');
  }
  return {
    id: value.id,
    colorName: value.colorName,
    colorCode: value.colorCode,
    isActive: value.isActive === null || typeof value.isActive === 'boolean' ? value.isActive : null,
  };
}

function typeOf(value: unknown): CatalogType {
  if (!record(value) || !id(value.id)) throw new ApiError(502, 'Thông tin loại dĩa chưa hợp lệ. Vui lòng liên hệ xưởng.');
  return {
    id: value.id,
    typeName: typeof value.typeName === 'string' ? value.typeName : null,
    shape: typeof value.shape === 'string' ? value.shape : null,
    dimensions: typeof value.dimensions === 'string' ? value.dimensions : null,
  };
}

export async function loadCatalog(signal: AbortSignal): Promise<CatalogData> {
  try {
    const [templates, plates, colors, types] = await Promise.all([
      loadRows('/api/choco-templates', signal),
      loadRows('/api/plates', signal),
      loadRows('/api/plate-colors', signal),
      loadRows('/api/plate-types', signal),
    ]);
    return {
      templates: templates.map(templateOf),
      plates: plates.map(plateOf),
      colors: colors.map(colorOf),
      types: types.map(typeOf),
    };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new ApiError(error.status, 'Thư viện chưa được mở cho khách. Vui lòng liên hệ xưởng để xem mẫu và dĩa hiện có.');
    }
    throw error;
  }
}

export function useCatalog(): CatalogState & { reload: () => void } {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    loadCatalog(controller.signal).then(
      (catalog) => { if (!controller.signal.aborted) setState({ status: 'ready', catalog }); },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Không tải được thư viện.' });
      },
    );
    return () => controller.abort();
  }, [revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, reload };
}

export function money(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Chưa có giá';
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

export function activeTemplates(catalog: CatalogData): CatalogTemplate[] {
  return catalog.templates.filter((item) => item.isActive === true && typeof item.plateTypeId === 'number' && item.plateTypeId > 0);
}

export function platesForTemplate(catalog: CatalogData, template: CatalogTemplate | undefined): CatalogPlate[] {
  if (!template || typeof template.plateTypeId !== 'number') return [];
  return catalog.plates.filter((plate) => {
    const color = catalog.colors.find((item) => item.id === plate.colorId);
    return plate.typeId === template.plateTypeId
      && color?.isActive === true
      && typeof plate.stockQuantity === 'number' && plate.stockQuantity > 0
      && typeof plate.price === 'number' && plate.price > 0;
  });
}
