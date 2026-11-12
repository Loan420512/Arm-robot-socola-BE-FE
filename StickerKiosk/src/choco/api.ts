import { useCallback, useEffect, useRef, useState } from 'react';

export type Entity = { id: number; [key: string]: unknown };
export type Page<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
export type User = { id: number; username: string | null; email: string | null; role: string };
export type Session = { accessToken: string; expiresAt: number; user: User };
export type LoginResponse = { accessToken: string; tokenType: string; expiresIn: number; user: User };
export type CustomerRegistration = { fullName: string; phone: string; email: string };
export type CustomerRegistrationReceipt = { customerId: number };

export const SESSION_KEY = 'chocorobot.admin.session.v1';
export const AUTH_EVENT = 'chocorobot:auth-change';
export const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isUser(value: unknown): value is User {
  return record(value)
    && Number.isSafeInteger(value.id) && (value.id as number) > 0
    && (value.username === null || typeof value.username === 'string')
    && (value.email === null || typeof value.email === 'string')
    && value.role === 'Admin';
}

function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 16_384
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function validSession(value: unknown): value is Session {
  return record(value) && validToken(value.accessToken) && isUser(value.user)
    && typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt)
    && value.expiresAt > Date.now();
}

function notifyAuthChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage can be blocked by browser settings. */ }
  notifyAuthChange();
}

export function readSession(): Session | null {
  let raw: string | null;
  try { raw = sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (validSession(value)) return value;
  } catch { /* Invalid stored sessions must never be sent to the API. */ }
  clearSession();
  return null;
}

export function saveLoginSession(value: unknown): Session {
  if (!record(value) || !validToken(value.accessToken) || !isUser(value.user)
    || typeof value.tokenType !== 'string' || value.tokenType.toLowerCase() !== 'bearer'
    || typeof value.expiresIn !== 'number' || !Number.isFinite(value.expiresIn) || value.expiresIn <= 0) {
    throw new ApiError(502, 'Máy chủ trả về phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
  }
  const session: Session = {
    accessToken: value.accessToken,
    expiresAt: Date.now() + value.expiresIn * 1000,
    user: value.user,
  };
  if (!validSession(session)) throw new ApiError(502, 'Thời hạn phiên đăng nhập không hợp lệ.');
  writeSession(session);
  return session;
}

export function updateSessionUser(user: User): void {
  if (!isUser(user)) throw new ApiError(502, 'Thông tin tài khoản quản trị không hợp lệ.');
  const session = readSession();
  if (session) writeSession({ ...session, user });
}

function writeSession(session: Session) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {
    throw new ApiError(0, 'Trình duyệt đang chặn lưu phiên đăng nhập. Hãy cho phép dữ liệu trang web và thử lại.');
  }
  notifyAuthChange();
}

function apiPath(path: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//') || path.includes('\\')) {
    throw new ApiError(0, 'Địa chỉ API không hợp lệ.');
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.split(/[?#]/, 1)[0].split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new ApiError(0, 'Địa chỉ API không hợp lệ.');
  }
  return normalized === '/api' || normalized.startsWith('/api/') ? normalized : `/api${normalized}`;
}

const messages: Record<string, string> = {
  'Invalid username or password': 'Tên đăng nhập hoặc mật khẩu không đúng.',
  'Authentication required': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'Access denied': 'Tài khoản không có quyền thực hiện thao tác này.',
  'Record not found': 'Không tìm thấy dữ liệu. Dữ liệu có thể đã được xóa.',
  'Validation failed': 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường bên dưới.',
  'Data conflicts with an existing record or reference': 'Dữ liệu bị trùng hoặc đang được bản ghi khác sử dụng.',
  'Unable to process the request': 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại.',
};

function responseError(body: unknown, status: number): ApiError {
  const data = record(body) ? body : {};
  const fields: Record<string, string[]> = {};
  if (record(data.errors)) {
    for (const [key, value] of Object.entries(data.errors)) {
      if (Array.isArray(value)) fields[key] = value.filter((item): item is string => typeof item === 'string');
    }
  }
  const supplied = typeof data.message === 'string' ? data.message
    : typeof data.title === 'string' ? data.title : '';
  const fallback = status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    : status === 403 ? 'Tài khoản không có quyền thực hiện thao tác này.'
      : status === 404 ? 'Không tìm thấy dữ liệu.'
        : status === 409 ? 'Dữ liệu bị trùng hoặc đang được sử dụng.'
          : status === 429 ? 'Bạn thao tác quá nhanh. Hãy chờ một phút rồi thử lại.'
            : status >= 500 ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.' : 'Không thể hoàn tất thao tác.';
  const title = messages[supplied] ?? (supplied || fallback);
  const details = Object.entries(fields).flatMap(([key, values]) => values.map((value) => `${key === '$' ? 'Dữ liệu' : key}: ${value}`));
  return new ApiError(status, details.length ? `${title}\n${details.join('\n')}` : title, fields);
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return sendRequest<T>(path, init, false);
}

const CATALOG_PATHS = new Set(['/api/choco-templates', '/api/plates', '/api/plate-types', '/api/plate-colors']);

/** Read the real catalog as a guest when possible. Authorization still belongs to the Backend. */
export async function readCatalog<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = apiPath(path);
  if (url.includes('#') || (!CATALOG_PATHS.has(url.split('?', 1)[0]) && !/^\/api\/template-elements\/by-template\/[1-9]\d*$/.test(url.split('?', 1)[0]))) {
    throw new ApiError(0, 'Địa chỉ thư viện không hợp lệ.');
  }
  return sendRequest<T>(url, { method: 'GET', signal }, true);
}

async function sendRequest<T>(path: string, init: RequestInit, catalog: boolean): Promise<T> {
  const url = apiPath(path);
  const isLogin = url.split('?', 1)[0].toLowerCase() === '/api/auth/login';
  const isRegistration = init.method?.toUpperCase() === 'POST' && url.split('?', 1)[0].toLowerCase() === '/api/customers';
  const anonymous = isLogin || isRegistration;
  const session = anonymous ? null : readSession();
  if (!anonymous && !session && !catalog) {
    clearSession();
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (init.signal?.aborted) throw new DOMException('Yêu cầu đã được hủy.', 'AbortError');

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`);
  else headers.delete('Authorization');
  if (typeof FormData !== 'undefined' && init.body instanceof FormData) headers.delete('Content-Type');
  else if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const controller = new AbortController();
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, headers, signal: controller.signal, credentials: 'same-origin', cache: 'no-store' });
    if (init.signal?.aborted) throw new DOMException('Yêu cầu đã được hủy.', 'AbortError');
    if (response.status === 401 && session && !anonymous && readSession()?.accessToken === session.accessToken) clearSession();
    if (catalog && (response.status === 401 || response.status === 403)) {
      throw new ApiError(response.status, 'Thư viện chưa được mở cho khách. Vui lòng liên hệ xưởng để xem mẫu và dĩa hiện có.');
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (init.signal?.aborted) throw new DOMException('Yêu cầu đã được hủy.', 'AbortError');
    let body: unknown = undefined;
    if (text.trim()) {
      try { body = JSON.parse(text); } catch {
        if (response.ok) throw new ApiError(502, 'Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
      }
    }
    if (!response.ok || (record(body) && body.success === false)) throw responseError(body, response.status);
    return (record(body) && body.success === true ? body.data : body) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (init.signal?.aborted) throw new DOMException('Yêu cầu đã được hủy.', 'AbortError');
    if (timedOut) throw new ApiError(0, 'Kết nối quá lâu. Vui lòng kiểm tra mạng và thử lại.');
    throw new ApiError(0, 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}

/** Saves contact information only; the public endpoint never creates a login account. */
export async function registerCustomer(input: CustomerRegistration, signal?: AbortSignal): Promise<CustomerRegistrationReceipt> {
  const receipt = await request<CustomerRegistrationReceipt>('/customers', {
    method: 'POST',
    body: JSON.stringify({ fullName: input.fullName.trim(), phone: input.phone.trim(), email: input.email.trim() }),
    signal,
  });
  if (!record(receipt) || !Number.isSafeInteger(receipt.customerId) || receipt.customerId < 1) {
    throw new ApiError(502, 'Máy chủ chưa xác nhận mã khách hàng. Vui lòng kiểm tra trước khi gửi lại.');
  }
  return receipt;
}

export async function list<T = Entity>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  signal?: AbortSignal,
): Promise<Page<T>> {
  const [pathname, existing = ''] = path.split('?', 2);
  const query = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
    else query.delete(key);
  }
  const suffix = query.toString();
  const page = await request<Page<T>>(`${pathname}${suffix ? `?${suffix}` : ''}`, { signal });
  if (!record(page) || !Array.isArray(page.items)
    || !Number.isSafeInteger(page.pageNumber) || page.pageNumber < 1
    || !Number.isSafeInteger(page.pageSize) || page.pageSize < 1
    || !Number.isSafeInteger(page.totalCount) || page.totalCount < 0
    || !Number.isSafeInteger(page.totalPages) || page.totalPages < 0) {
    throw new ApiError(502, 'Máy chủ trả về danh sách không hợp lệ. Vui lòng tải lại.');
  }
  return page;
}

export async function listAll<T = Entity>(path: string, signal?: AbortSignal): Promise<T[]> {
  const first = await list<T>(path, { pageNumber: 1, pageSize: 100 }, signal);
  const items = [...first.items];
  for (let pageNumber = 2; pageNumber <= first.totalPages; pageNumber++) {
    const page = await list<T>(path, { pageNumber, pageSize: 100 }, signal);
    items.push(...page.items);
  }
  return items;
}

export function useQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
} {
  const latestFetcher = useRef(fetcher);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; revision: number; data: T | null; error: string }>({ key, revision: -1, data: null, error: '' });
  useEffect(() => { latestFetcher.current = fetcher; });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const fetchForKey = latestFetcher.current;
    Promise.resolve().then(() => fetchForKey(controller.signal)).then(
      (data) => { if (active) setState({ key, revision, data, error: '' }); },
      (error: unknown) => {
        if (active && !controller.signal.aborted) {
          setState({ key, revision, data: null, error: error instanceof Error ? error.message : 'Không tải được dữ liệu. Vui lòng thử lại.' });
        }
      },
    );
    return () => { active = false; controller.abort(); };
  }, [key, revision]);
  const reload = useCallback(() => setRevision((previous) => previous + 1), []);
  const settled = state.key === key && state.revision === revision;
  return {
    data: state.key === key ? state.data : null,
    loading: !settled,
    error: settled ? state.error : '',
    reload,
  };
}
