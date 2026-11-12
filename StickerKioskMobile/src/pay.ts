import { request } from './api';

export type PayResult = {
  checkoutUrl: string;
  orderCode: string;
  amount: number;
  qrCode: string | null;
  orderId: number;
  plateId: number;
};

export type Contact = { fullName: string; phone: string; email: string };

let remembered: PayResult | null = null;

export function rememberedPay(): PayResult | null {
  return remembered;
}

export function rememberPay(value: PayResult | null): void {
  remembered = value;
}

export function sameMoney(left: number, right: number): boolean {
  return Math.round(left) === Math.round(right);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function payFrom(data: unknown, plateId: number, fallbackAmount: number): PayResult {
  if (!record(data) || typeof data.checkoutUrl !== 'string' || !data.checkoutUrl.startsWith('http')) {
    throw new Error('Không tạo được link thanh toán PayOS. Vui lòng thử lại.');
  }
  const orderId = typeof data.orderId === 'number' ? data.orderId : null;
  if (orderId === null) throw new Error('Máy chủ chưa trả mã đơn. Vui lòng thử lại.');
  return {
    checkoutUrl: data.checkoutUrl,
    orderCode: typeof data.orderCode === 'string' ? data.orderCode : '',
    amount: typeof data.amount === 'number' ? data.amount : fallbackAmount,
    qrCode: typeof data.qrCode === 'string' ? data.qrCode : null,
    orderId,
    plateId,
  };
}

export async function registerCustomer(contact: Contact): Promise<number> {
  const receipt = await request<unknown>('/api/customers', { method: 'POST', body: contact });
  if (!record(receipt) || typeof receipt.customerId !== 'number') {
    throw new Error('Máy chủ chưa xác nhận mã khách hàng. Vui lòng kiểm tra trước khi gửi lại.');
  }
  return receipt.customerId;
}

/** Always creates a new customer, a new order, and a new PayOS payment. */
export async function createPayOsInvoice(contact: Contact, plateId: number, templateId: number, fallbackAmount: number): Promise<PayResult> {
  const data = await request<unknown>('/api/checkout/payos', {
    method: 'POST',
    body: { ...contact, plateId, chocoTemplateId: templateId },
  });
  const result = payFrom(data, plateId, fallbackAmount);
  rememberPay(result);
  return result;
}

/** New PayOS link for an unpaid order whose plate price still matches. */
export async function retryPayOsInvoice(orderId: number, plateId: number, fallbackAmount: number): Promise<PayResult> {
  const data = await request<unknown>('/api/checkout/payos/retry', { method: 'POST', body: { orderId } });
  const result = payFrom(data, plateId, fallbackAmount);
  rememberPay(result);
  return result;
}

export async function paymentIsPaid(orderId: number): Promise<boolean> {
  const data = await request<unknown>(`/api/checkout/payos/status/${orderId}`);
  return record(data) && data.paid === true;
}
