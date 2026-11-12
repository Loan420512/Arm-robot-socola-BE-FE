const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export function money(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? currency.format(value) : '—';
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : '—';
}

const statusLabels: Record<string, string> = {
  Pending: 'Chờ xử lý',
  Processing: 'Đang xử lý',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  Success: 'Thành công',
  Failed: 'Thất bại',
  Refunded: 'Đã hoàn tiền',
  Approved: 'Đã duyệt',
  Rejected: 'Đã từ chối',
  Open: 'Mới ghi nhận',
  'In Progress': 'Đang giải quyết',
  Resolved: 'Đã giải quyết',
  Matched: 'Khớp số liệu',
  Discrepancy: 'Có chênh lệch',
  Cash: 'Tiền mặt',
  VNPay: 'VNPay',
  Momo: 'MoMo',
  ZaloPay: 'ZaloPay',
  Support: 'Hỗ trợ',
  Operator: 'Vận hành',
  Designer: 'Thiết kế',
  Admin: 'Quản trị viên',
  Active: 'Đang hoạt động',
  Inactive: 'Tạm ngưng',
};

export function statusLabel(value: string): string {
  return statusLabels[value] ?? value;
}
