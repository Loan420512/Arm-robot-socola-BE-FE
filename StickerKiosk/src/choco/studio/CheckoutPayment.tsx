import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Coins, QrCode, Receipt } from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { money } from '../format';

export type PayResult = { checkoutUrl: string; orderCode: string; amount: number; qrCode?: string | null };

function PayOsQr({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 280, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (active) setSrc(url); })
      .catch(() => { if (active) setSrc(null); });
    return () => { active = false; };
  }, [value]);
  if (!src) return <p className="checkout-qr-fallback">Đang tạo mã QR…</p>;
  return <img className="checkout-qr" src={src} width={280} height={280} alt="Mã QR PayOS. Quét bằng ứng dụng ngân hàng để chuyển khoản." />;
}

export async function paymentIsPaid(orderId: number) {
  const response = await fetch(`/api/checkout/payos/status/${orderId}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const body: unknown = await response.json().catch(() => undefined);
  const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
  const data = record(body) && record(body.data) ? body.data : undefined;
  return Boolean(response.ok && data && data.paid === true);
}

function usePaymentPaid(orderId: number | null, active: boolean) {
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (!active || orderId === null || paid) return;
    let stopped = false;
    const check = async () => {
      try {
        if (!stopped && await paymentIsPaid(orderId)) setPaid(true);
      } catch { /* thử lại ở lần hỏi sau */ }
    };
    void check();
    const timer = window.setInterval(check, 4000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [active, orderId, paid]);
  return paid;
}

export function CheckoutPayment({ price, ready, onPayOs, paying, payError, payResult, onRetry, retrying, orderId = null, onPaid }: {
  price: number | null | undefined;
  ready: boolean;
  onPayOs?: () => void;
  paying?: boolean;
  payError?: string | null;
  payResult?: PayResult | null;
  onRetry?: () => void;
  retrying?: boolean;
  orderId?: number | null;
  onPaid?: () => void;
}) {
  const paid = usePaymentPaid(orderId, Boolean(payResult));
  const reportedPaid = useRef(false);
  useEffect(() => {
    if (!paid || reportedPaid.current) return;
    reportedPaid.current = true;
    onPaid?.();
  }, [paid, onPaid]);
  return <section className="checkout-payment" aria-labelledby="checkout-payment-title">
    <div className="checkout-payment-heading"><h2 id="checkout-payment-title">Thanh toán</h2><span className={paid ? 'status-badge status-success' : 'status-badge status-pending'}>{paid ? 'Đã thanh toán' : 'Chưa thu tiền'}</span></div>
    <dl className="checkout-payment-price"><div><dt>Giá dĩa theo danh mục</dt><dd>{ready ? money(price) : 'Chưa xác nhận'}</dd></div></dl>
    {payResult ? <>
      <div className="notice notice-success" role="status"><CheckCircle size={20} /><div>
        <p><strong>{paid ? 'Thanh toán thành công' : `Mã thanh toán: ${payResult.orderCode}`}</strong></p>
        <p>Số tiền {paid ? 'đã thanh toán' : 'cần thanh toán'}: <strong>{money(payResult.amount)}</strong></p>
        <p>{paid ? 'PayOS đã ghi nhận tiền về tài khoản xưởng. Đơn hàng đã được thanh toán thành công.' : 'Quét mã QR bằng ứng dụng ngân hàng. Tiền chuyển thẳng vào tài khoản PayOS của xưởng. Trang này tự cập nhật khi tiền về.'}</p>
      </div></div>
      {!paid && (payResult.qrCode
        ? <div className="checkout-qr-box"><PayOsQr value={payResult.qrCode} /><p>Quét mã này để thanh toán {money(payResult.amount)}</p></div>
        : <a className="button button-primary" href={payResult.checkoutUrl} target="_blank" rel="noreferrer">Mở trang thanh toán PayOS</a>)}
      {!paid && <button className="button button-secondary" type="button" disabled={!ready || retrying} onClick={onRetry}>{retrying ? 'Đang tạo mã mới…' : 'Tạo lại mã thanh toán'}</button>}
    </> : <>
      <div className="checkout-payment-method"><Coins size={25} aria-hidden="true" /><div><h3>Tiền mặt tại xưởng</h3><p>Nhân viên xác nhận đơn và ghi nhận thanh toán sau khi thực sự nhận đủ tiền.</p></div></div>
      <div className="checkout-payment-method"><QrCode size={25} aria-hidden="true" /><div><h3>Thanh toán online qua PayOS</h3><p>Quét mã QR hoặc chuyển khoản ngân hàng. Đơn hàng được tạo ngay và xưởng xác nhận sau khi tiền về.</p></div>{onPayOs && <button className="button button-primary" type="button" disabled={!ready} onClick={onPayOs}>{paying ? <>Đang tạo mã thanh toán…</> : 'Tạo mã thanh toán PayOS'}</button>}</div>
    </>}
    {payError && !payResult && <div className="notice notice-error" role="alert"><span>{payError} Vui lòng bấm nút dưới để tạo mã mới và thanh toán lại.</span>{onRetry && <button type="button" className="button button-secondary" disabled={retrying} onClick={onRetry}>{retrying ? 'Đang thử lại…' : 'Thử thanh toán lại'}</button>}</div>}
    <p className="checkout-payment-help">Gửi thông tin bên dưới chỉ lưu liên hệ, chưa đặt đơn hoặc thu tiền.</p>
    <details className="checkout-cashier"><summary><Receipt size={18} aria-hidden="true" />Dành cho nhân viên thu ngân</summary><p>Đăng nhập Admin, chọn đơn hàng và xác nhận số tiền mặt đã thực nhận.</p><Link className="text-link" to="/quan-ly/payments?new=1">Mở ghi nhận thanh toán</Link></details>
  </section>;
}
