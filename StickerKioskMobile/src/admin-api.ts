import { createHttp, failureMessage, type HttpResult } from '../../StickerKiosk/src/api/http';
import { parsePublicOrder } from '../../StickerKiosk/src/api/order';
import type { PublicOrder } from '../../StickerKiosk/src/kiosk/port';
import { cells, encodeMask, maskBytes, type AssetPose, type OccupancyMask } from '../../StickerKiosk/src/kiosk/sheet';
import { API_ORIGIN } from './api-origin';

export interface AdminSession {
  readonly token: string;
  readonly username: string;
  readonly role: string;
}

let token: string | null = null;

export function adminToken(): string | null {
  return token;
}

export function setAdminToken(next: string | null) {
  token = next;
}

const http = createHttp(`${API_ORIGIN}/api`, 30_000, adminToken);

function ok<T>(result: HttpResult, map: (data: unknown) => T): { ok: true; data: T } | { ok: false; message: string } {
  if (!result.ok) return { ok: false, message: failureMessage(result.failure) };
  return { ok: true, data: map(result.data) };
}

export async function login(username: string, password: string) {
  const mapped = ok(await http.post('/Auth/login', { username, password }), (data) => data as AdminSession);
  if (mapped.ok) setAdminToken(mapped.data.token);
  return mapped;
}

export async function uploadAsset(kind: 'phone' | 'case' | 'sticker', file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  return ok(await http.upload('/Uploads', form), (data) => (data as { url: string }).url);
}

export async function savePhoneFit(id: number, modelUrl: string, pose: AssetPose) {
  return ok(await http.put(`/PhoneModels/${id}/fit`, { modelUrl, backAxis: pose.back, upAxis: pose.up }), () => null);
}

export async function updateCaseModel(id: number, modelId: number, sku: string, material: string, color: string, price: number, stockQuantity: number) {
  return ok(await http.put(`/PhoneCases/${id}`, { modelId, sku, material, color, price, stockQuantity }), () => null);
}

/** A full open back. The website calibrator can paint holes afterwards. */
export function openBackMask(widthMm: number, heightMm: number): OccupancyMask {
  const cols = cells(widthMm);
  const rows = cells(heightMm);
  const bits = new Uint8Array(maskBytes(cols, rows));
  bits.fill(255);
  return { cols, rows, bits };
}

export async function saveCaseFit(input: {
  id: number;
  modelUrl: string;
  pose: AssetPose;
  heightMm: number;
  widthMm: number;
  insetMm: number;
  scale: number;
}) {
  const mask = openBackMask(input.widthMm, input.heightMm);
  return ok(
    await http.put(`/PhoneCases/${input.id}/fit`, {
      modelUrl: input.modelUrl,
      backAxis: input.pose.back,
      upAxis: input.pose.up,
      heightMm: input.heightMm,
      backWidthMm: input.widthMm,
      maskCols: mask.cols,
      maskRows: mask.rows,
      maskBase64: encodeMask(mask),
      phoneInsetMm: input.insetMm,
      phoneScale: input.scale,
    }),
    () => null,
  );
}

export async function createSticker(input: { name: string; imageUrl: string; widthMm: number; heightMm: number; price: number }) {
  return ok(
    await http.post('/StickerProducts', {
      stickerName: input.name,
      imageUrl: input.imageUrl,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      price: input.price,
      isActive: true,
    }),
    () => null,
  );
}

export async function listOrders(): Promise<{ ok: true; data: (PublicOrder & { id: number })[] } | { ok: false; message: string }> {
  return ok(await http.get('/Orders'), (data) =>
    (Array.isArray(data) ? data : []).flatMap((row) => {
      const order = parsePublicOrder(row);
      if (!order) return [];
      const record = row as Record<string, unknown>;
      return [{ ...order, id: Number(record.id) }];
    }),
  );
}

export async function setOrderStatus(id: number, status: 'Processing' | 'Completed' | 'Cancelled') {
  return ok(await http.put(`/Orders/${id}/status`, { status }), () => null);
}
