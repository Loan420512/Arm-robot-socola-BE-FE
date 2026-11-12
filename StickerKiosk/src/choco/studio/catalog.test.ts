import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCatalog, loadTemplateElements, loadTemplates, safeAssetUrl } from './catalog';
import type { CatalogTemplate } from './catalog';

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const template: CatalogTemplate = { id: 1, plateTypeId: 3, templateName: 'Mẫu do API trả về', imagePreviewUrl: '/uploads/choco-templates/one.png', gcodeFileUrl: '/files/one.gcode', isActive: true };

function page(items: unknown[], pageNumber = 1, totalCount = items.length, pageSize = 100) {
  return { items, pageNumber, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('sessionStorage', { getItem: () => null });
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('API catalog data', () => {
  it('loads templates through all pages without substituting local patterns', async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({ ...template, id: index + 1 }));
    fetchMock.mockResolvedValueOnce(response(page(first, 1, 101)))
      .mockResolvedValueOnce(response(page([{ ...template, id: 101, templateName: null }], 2, 101)));
    const templates = await loadTemplates();
    expect(templates).toHaveLength(101);
    expect(templates.at(-1)?.templateName).toBeNull();
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      '/api/choco-templates?pageNumber=1&pageSize=100', '/api/choco-templates?pageNumber=2&pageSize=100',
    ]);
  });

  it('keeps a truly empty catalog empty', async () => {
    fetchMock.mockImplementation(async () => response(page([])));
    await expect(loadCatalog()).resolves.toEqual({ templates: [], plates: [], colors: [], types: [] });
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      '/api/choco-templates?pageNumber=1&pageSize=100', '/api/plates?pageNumber=1&pageSize=100',
      '/api/plate-colors?pageNumber=1&pageSize=100', '/api/plate-types?pageNumber=1&pageSize=100',
    ]);
  });

  it('preserves real zero prices and missing stock without inventing amounts or availability', async () => {
    fetchMock.mockImplementation(async url => {
      const path = String(url).split('?')[0];
      if (path === '/api/choco-templates') return response(page([template]));
      if (path === '/api/plates') return response(page([{ id: 9, typeId: 3, colorId: 4, sku: 'REAL-9', price: 0, stockQuantity: null, material: null, color: null, colorName: null, colorCode: null, typeName: null, shape: null, dimensions: null }]));
      if (path === '/api/plate-colors') return response(page([{ id: 4, colorName: 'Màu API', colorCode: '#abcdef', isActive: true }]));
      return response(page([{ id: 3, typeName: null, shape: null, dimensions: null }]));
    });
    const result = await loadCatalog();
    expect(result.plates[0].price).toBe(0);
    expect(result.plates[0].stockQuantity).toBeNull();
    expect(result.templates[0]).toEqual(template);
  });

  it.each([
    { items: [], pageNumber: 1, pageSize: 100, totalCount: -1, totalPages: 0 },
    { items: [], pageNumber: 2, pageSize: 100, totalCount: 0, totalPages: 0 },
    { items: [], pageNumber: 1, pageSize: 100, totalCount: 100, totalPages: 99 },
  ])('rejects invalid paging metadata', async data => {
    fetchMock.mockResolvedValue(response(data));
    await expect(loadTemplates()).rejects.toMatchObject({ status: 502 });
  });

  it.each([
    { ...template, id: 0 }, { ...template, id: '1' }, { ...template, plateTypeId: -3 },
    { ...template, imagePreviewUrl: 42 }, { ...template, isActive: 'true' },
  ])('rejects invalid template data instead of rendering a substitute', async data => {
    fetchMock.mockResolvedValue(response(page([data])));
    await expect(loadTemplates()).rejects.toMatchObject({ status: 502 });
  });

  it('rejects repeated records across pages and honors caller cancellation', async () => {
    fetchMock.mockResolvedValueOnce(response(page([template, { ...template, id: 2 }], 1, 3, 2)))
      .mockResolvedValueOnce(response(page([template], 2, 3, 2)));
    await expect(loadTemplates()).rejects.toMatchObject({ status: 502 });
    fetchMock.mockClear();
    const controller = new AbortController(); controller.abort();
    await expect(loadTemplates(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('API media addresses', () => {
  it('resolves relative API media and accepts HTTP or HTTPS assets', () => {
    expect(safeAssetUrl('/uploads/choco-templates/one.png')).toBe('http://localhost:5173/uploads/choco-templates/one.png');
    expect(safeAssetUrl('https://assets.example.test/template.png')).toBe('https://assets.example.test/template.png');
  });
  it.each([null, '', 'javascript:alert(1)', 'data:image/svg+xml,test', 'https://user:password@example.test/image.png', '/uploads\\image.png', 'https://example.test/ a.png'])('rejects unsafe media addresses: %s', value => {
    expect(safeAssetUrl(value)).toBeNull();
  });
});


describe('database layout data',()=>{
  it('loads literal element text, coordinates and scale from the selected template route',async()=>{const element={id:1,templateId:1,staffId:1,elementName:'Happy Birthday',positionX:100,positionY:75,scale:1};fetchMock.mockResolvedValue(response(page([element])));await expect(loadTemplateElements(1)).resolves.toEqual([element]);expect(fetchMock.mock.calls[0][0]).toBe('/api/template-elements/by-template/1?pageNumber=1&pageSize=100');});
  it('rejects rows for a different template or invalid coordinates rather than inventing a layout',async()=>{fetchMock.mockResolvedValue(response(page([{id:1,templateId:2,staffId:1,elementName:'Happy Birthday',positionX:100,positionY:75,scale:1}])));await expect(loadTemplateElements(1)).rejects.toMatchObject({status:502});});
  it('requires a positive template ID before any request',async()=>{await expect(loadTemplateElements(0)).rejects.toMatchObject({status:0});expect(fetchMock).not.toHaveBeenCalled();});
});
