import { API_ORIGIN } from './api-origin';

const TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const messages: Record<string, string> = {
  'Invalid username or password': 'Tên đăng nhập hoặc mật khẩu không đúng.',
  'Authentication required': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'Access denied': 'Tài khoản không có quyền thực hiện thao tác này.',
  'Record not found': 'Không tìm thấy dữ liệu.',
  'Validation failed': 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  'Plate is out of stock': 'Dĩa này đã hết hàng.',
  'Template is inactive': 'Mẫu này không còn được dùng.',
  'Template is incompatible with plate type': 'Mẫu không cùng loại với dĩa đã chọn.',
  'Plate color is inactive': 'Màu dĩa không còn được dùng.',
  'Invalid Plate reference': 'Không tìm thấy dĩa đã chọn.',
  'Invalid ChocoTemplate reference': 'Không tìm thấy mẫu đã chọn.',
};

function responseError(body: unknown, status: number, retryAfter: string | null): ApiError {
  const data = record(body) ? body : {};
  const supplied = typeof data.message === 'string' ? data.message : '';
  const fallback = status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    : status === 403 ? 'Tài khoản không có quyền thực hiện thao tác này.'
      : status === 404 ? 'Không tìm thấy dữ liệu.'
        : status === 409 ? 'Dữ liệu bị trùng hoặc dĩa không còn đặt được.'
          : status === 429 ? 'Bạn thao tác quá nhanh. Hãy chờ một chút rồi thử lại.'
            : status >= 500 ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'
              : 'Không thể hoàn tất thao tác.';
  const title = messages[supplied] ?? (supplied || fallback);
  const hint = status === 429 && retryAfter ? `${title} Vui lòng chờ khoảng ${retryAfter} giây rồi bấm lại.` : title;
  return new ApiError(status, hint);
}

export async function request<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  let body: string | undefined;
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, { method, headers, body, signal: controller.signal });
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    let parsed: unknown;
    if (text.trim()) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        if (response.ok) throw new ApiError(502, 'Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
      }
    }
    if (!response.ok || (record(parsed) && parsed.success === false)) {
      throw responseError(parsed, response.status, response.headers.get('Retry-After'));
    }
    return (record(parsed) && parsed.success === true ? parsed.data : parsed) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError(0, 'Kết nối quá lâu. Vui lòng kiểm tra mạng và thử lại.');
    throw new ApiError(0, 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
  } finally {
    clearTimeout(timer);
  }
}
