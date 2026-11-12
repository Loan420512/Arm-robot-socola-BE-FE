import { ApiError, request } from './api';

export type AdminUser = { id: number; username: string | null; email: string | null; role: 'Admin' };
export type AdminOrder = { id: number; orderCode: string | null; status: string | null; totalAmount: number | null };

let token: string | null = null;

export function adminToken(): string | null {
  return token;
}

export function clearAdmin(): void {
  token = null;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function userOf(value: unknown): AdminUser {
  if (!record(value) || typeof value.id !== 'number' || value.role !== 'Admin') {
    throw new ApiError(502, 'Máy chủ trả về phiên đăng nhập không hợp lệ.');
  }
  return {
    id: value.id,
    username: typeof value.username === 'string' ? value.username : null,
    email: typeof value.email === 'string' ? value.email : null,
    role: 'Admin',
  };
}

export async function login(username: string, password: string): Promise<AdminUser> {
  const data = await request<unknown>('/api/auth/login', { method: 'POST', body: { username, password } });
  if (!record(data) || typeof data.accessToken !== 'string' || (data.tokenType !== 'Bearer' && data.tokenType !== 'bearer')) {
    throw new ApiError(502, 'Máy chủ trả về phiên đăng nhập không hợp lệ.');
  }
  const user = userOf(data.user);
  token = data.accessToken;
  return user;
}

export async function listOrders(): Promise<AdminOrder[]> {
  if (!token) throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const page = await request<unknown>('/api/orders?pageNumber=1&pageSize=20', { token });
  if (!record(page) || !Array.isArray(page.items)) throw new ApiError(502, 'Máy chủ trả về danh sách đơn không hợp lệ.');
  return page.items.flatMap((item) => {
    if (!record(item) || typeof item.id !== 'number') return [];
    return [{
      id: item.id,
      orderCode: typeof item.orderCode === 'string' ? item.orderCode : null,
      status: typeof item.status === 'string' ? item.status : null,
      totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : null,
    }];
  });
}
