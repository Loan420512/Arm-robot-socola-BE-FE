import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError, AUTH_EVENT, REQUEST_TIMEOUT_MS, SESSION_KEY,
  list, listAll, readCatalog, readSession, registerCustomer, request, saveLoginSession,
} from './api';
import type { LoginResponse } from './api';
import { money } from './format';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const loginResponse: LoginResponse = {
  accessToken: 'test.payload.signature',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: { id: 7, username: 'test-admin', email: null, role: 'Admin' },
};

let storage: MemoryStorage;
let events: EventTarget;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function authenticated() { saveLoginSession(loginResponse); }

beforeEach(() => {
  storage = new MemoryStorage();
  events = new EventTarget();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('window', events);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('catalog reads respect Backend authorization', () => {
  it('makes a real guest GET only for an allowed catalog collection and keeps management protected', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { items: [] } }));
    await expect(readCatalog('/choco-templates?pageNumber=1&pageSize=100')).resolves.toEqual({ items: [] });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/choco-templates?pageNumber=1&pageSize=100');
    expect(options?.method).toBe('GET');
    expect(options?.body).toBeUndefined();
    expect(new Headers(options?.headers).get('Authorization')).toBeNull();
    await expect(request('/plates')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(['/auth/me', '/admin/customers', '/plates/1', '/choco-templates/upload-image', '//outside.example/plates', '/plates#fragment'])('rejects non-catalog or non-collection paths: %s', async path => {
    await expect(readCatalog(path)).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a guest catalog 401 without pretending the visitor has an expired Customer session', async () => {
    const changed = vi.fn();
    events.addEventListener(AUTH_EVENT, changed);
    fetchMock.mockResolvedValue(json({ success: false, message: 'Authentication required', data: null }, 401));
    await expect(readCatalog('/plates')).rejects.toMatchObject({ status: 401, message: 'Thư viện chưa được mở cho khách. Vui lòng liên hệ xưởng để xem mẫu và dĩa hiện có.' });
    expect(changed).not.toHaveBeenCalled();
    expect(readSession()).toBeNull();
  });

  it('uses a genuine current Admin session for catalog reads and clears it if the Backend rejects it', async () => {
    authenticated();
    fetchMock.mockResolvedValueOnce(json({ success: true, data: [] }));
    await readCatalog('/plate-colors');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${loginResponse.accessToken}`);
    fetchMock.mockResolvedValueOnce(json({ success: false, message: 'Authentication required', data: null }, 401));
    await expect(readCatalog('/plates')).rejects.toMatchObject({ status: 401 });
    expect(readSession()).toBeNull();
  });
});

describe('ChocoRobot API contract', () => {
  it('posts login without a bearer and accepts the real accessToken / expiresIn / user response', async () => {
    fetchMock.mockResolvedValue(json({ success: true, message: 'Login successful', data: loginResponse }));
    const response = await request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'test-admin', password: 'form-input' }) });
    const started = Date.now();
    saveLoginSession(response);
    const restored = readSession();
    expect(restored?.accessToken).toBe(loginResponse.accessToken);
    expect(restored?.user).toEqual(loginResponse.user);
    expect(restored?.expiresAt).toBeGreaterThanOrEqual(started + 3_600_000);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(new Headers(options?.headers).get('Authorization')).toBeNull();
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
  });

  it('unwraps the success envelope and authenticates only against the local API', async () => {
    authenticated();
    fetchMock.mockResolvedValue(json({ success: true, data: { id: 4, name: 'Dĩa tròn' } }));
    await expect(request('/plates/4')).resolves.toEqual({ id: 4, name: 'Dĩa tròn' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/plates/4');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${loginResponse.accessToken}`);
    await expect(request('https://outside.example/plates')).rejects.toThrow('Địa chỉ API không hợp lệ');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('handles successful deletes and status changes with no response body', async () => {
    authenticated();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(request<void>('/plates/4', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('preserves the multipart boundary for template image uploads', async () => {
    authenticated();
    fetchMock.mockResolvedValue(json({ success: true, data: { imagePreviewUrl: '/uploads/template.png' } }));
    const form = new FormData();
    form.append('File', new Blob(['image'], { type: 'image/png' }), 'template.png');
    await request('/choco-templates/upload-image', { method: 'POST', body: form, headers: { 'Content-Type': 'multipart/form-data' } });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('Content-Type')).toBe(false);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(form);
  });

  it('preserves field errors from ASP.NET validation for useful form feedback', async () => {
    authenticated();
    fetchMock.mockResolvedValue(json({ title: 'One or more validation errors occurred.', errors: { Name: ['The Name field is required.'], Price: ['Price must be greater than 0.'] } }, 400));
    const result = request('/plates', { method: 'POST', body: '{}' });
    await expect(result).rejects.toMatchObject({ status: 400, fields: { Name: ['The Name field is required.'], Price: ['Price must be greater than 0.'] } });
    await expect(result).rejects.toThrow('Name: The Name field is required.');
  });

  it('explains backend conflicts and does not expose diagnostic trace values', async () => {
    authenticated();
    fetchMock.mockResolvedValue(json({ success: false, message: 'Data conflicts with an existing record or reference', errors: { traceId: 'internal-trace' } }, 409));
    const result = request('/plate-types/1', { method: 'DELETE' });
    await expect(result).rejects.toThrow('Dữ liệu bị trùng hoặc đang được bản ghi khác sử dụng.');
    await expect(result).rejects.not.toThrow('internal-trace');
  });

  it('clears the active session and announces authentication loss after a 401', async () => {
    authenticated();
    const changed = vi.fn();
    events.addEventListener(AUTH_EVENT, changed);
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(request('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(readSession()).toBeNull();
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    expect(changed).toHaveBeenCalledOnce();
  });

  it('does not discard a new login when an older in-flight request returns 401', async () => {
    authenticated();
    let respond: (response: Response) => void = () => undefined;
    fetchMock.mockImplementation(() => new Promise((resolve) => { respond = resolve; }));
    const oldRequest = request('/plates');
    saveLoginSession({ ...loginResponse, accessToken: 'new.payload.signature' });
    respond(new Response(null, { status: 401 }));
    await expect(oldRequest).rejects.toMatchObject({ status: 401 });
    expect(readSession()?.accessToken).toBe('new.payload.signature');
  });

  it('does not let an abandoned startup check clear the session after cancellation', async () => {
    authenticated();
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const controller = new AbortController();
    const abandoned = request('/auth/me', { signal: controller.signal });
    controller.abort();
    await expect(abandoned).rejects.toMatchObject({ name: 'AbortError' });
    expect(readSession()?.accessToken).toBe(loginResponse.accessToken);
  });

  it('collects every page so reference dropdowns do not silently omit records', async () => {
    authenticated();
    fetchMock.mockResolvedValueOnce(json({ success: true, data: { items: [{ id: 1 }], pageNumber: 1, pageSize: 100, totalCount: 101, totalPages: 2 } }))
      .mockResolvedValueOnce(json({ success: true, data: { items: [{ id: 101 }], pageNumber: 2, pageSize: 100, totalCount: 101, totalPages: 2 } }));
    await expect(listAll('/customers')).resolves.toEqual([{ id: 1 }, { id: 101 }]);
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url), 'http://test.local'));
    expect(urls.map((url) => url.searchParams.get('pageNumber'))).toEqual(['1', '2']);
    expect(urls.every((url) => url.searchParams.get('pageSize') === '100')).toBe(true);
  });

  it('encodes list filters, preserves false and zero, and omits empty filters', async () => {
    authenticated();
    const page = { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0 };
    fetchMock.mockResolvedValue(json({ success: true, data: page }));
    await expect(list('/plates', { search: 'Dĩa & màu', isActive: false, minPrice: 0, typeId: undefined, color: '' })).resolves.toEqual(page);
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://test.local');
    expect(url.searchParams.get('search')).toBe('Dĩa & màu');
    expect(url.searchParams.get('isActive')).toBe('false');
    expect(url.searchParams.get('minPrice')).toBe('0');
    expect(url.searchParams.has('typeId')).toBe(false);
    expect(url.searchParams.has('color')).toBe(false);
  });

  it('reports malformed success responses instead of treating them as empty data', async () => {
    authenticated();
    fetchMock.mockResolvedValue(new Response('<html>unexpected page</html>'));
    await expect(request('/plates')).rejects.toMatchObject({ status: 502 });
  });

  it('distinguishes caller cancellation from a network failure', async () => {
    authenticated();
    const controller = new AbortController();
    controller.abort();
    await expect(request('/plates', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(request('/plates')).rejects.toThrow('Không kết nối được máy chủ');
  });

  it('aborts a stalled request and provides an actionable timeout message', async () => {
    authenticated();
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const result = request('/plates');
    const assertion = expect(result).rejects.toThrow('Kết nối quá lâu');
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await assertion;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});

describe('public customer contact registration', () => {
  it('sends only trimmed contact fields and accepts the backend customerId receipt without a session', async () => {
    fetchMock.mockResolvedValue(json({ success: true, message: 'Contact information saved', data: { customerId: 27 } }, 201));
    const input = { fullName: '  Nguyễn An  ', phone: ' 0900000000 ', email: ' an@example.test ', password: 'never-send' };
    await expect(registerCustomer(input)).resolves.toEqual({ customerId: 27 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/customers');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({ fullName: 'Nguyễn An', phone: '0900000000', email: 'an@example.test' });
    expect(new Headers(options?.headers).get('Authorization')).toBeNull();
    expect(readSession()).toBeNull();
  });

  it('keeps customer management protected and does not anonymously allow other customer methods', async () => {
    await expect(request('/admin/customers')).rejects.toMatchObject({ status: 401 });
    await expect(request('/customers')).rejects.toMatchObject({ status: 401 });
    await expect(request('/customers/1', { method: 'PUT', body: '{}' })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not send or clear an admin session while submitting public contact information', async () => {
    authenticated();
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(registerCustomer({ fullName: 'Nguyễn An', phone: '0900000000', email: 'an@example.test' })).rejects.toMatchObject({ status: 401 });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBeNull();
    expect(readSession()?.accessToken).toBe(loginResponse.accessToken);
  });

  it.each([{ id: 27 }, { customerId: 0 }, { customerId: '27' }, null])('does not report registration success for an invalid receipt: %j', async (receipt) => {
    fetchMock.mockResolvedValue(json({ success: true, data: receipt }, 201));
    await expect(registerCustomer({ fullName: 'Nguyễn An', phone: '0900000000', email: 'an@example.test' })).rejects.toMatchObject({ status: 502 });
  });
});

describe('financial amounts', () => {
  it('shows fractional backend amounts without rounding them to a different VND value', () => {
    expect(money(0.01).replaceAll('\u00a0', ' ')).toBe('0,01 ₫');
    expect(money(1000.50).replaceAll('\u00a0', ' ')).toBe('1.000,5 ₫');
    expect(money(1000).replaceAll('\u00a0', ' ')).toBe('1.000 ₫');
  });
});

describe('restored admin sessions', () => {
  it.each([
    '{broken-json',
    JSON.stringify({ ...loginResponse, expiresAt: Date.now() - 1 }),
    JSON.stringify({ accessToken: 'test.payload.signature', expiresAt: Date.now() + 60_000, user: { ...loginResponse.user, role: 'Customer' } }),
    JSON.stringify({ accessToken: 'not-a-jwt', expiresAt: Date.now() + 60_000, user: loginResponse.user }),
  ])('removes expired, corrupted or incompatible saved sessions', async (stored) => {
    storage.setItem(SESSION_KEY, stored);
    expect(readSession()).toBeNull();
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    await expect(request('/plates')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses the old StickerRobot token shape', () => {
    expect(() => saveLoginSession({ token: 'old.payload.signature', expiresAt: '2099-01-01', user: loginResponse.user })).toThrow('phiên đăng nhập không hợp lệ');
    expect(readSession()).toBeNull();
  });
});
