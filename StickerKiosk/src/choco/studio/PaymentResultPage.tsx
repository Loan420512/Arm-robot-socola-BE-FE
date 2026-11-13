import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { ApiError } from '../api';
import { money } from '../format';
import { StudioHeader } from './StudioHeader';
import './studio.css';

export default function PaymentResultPage({ success }: { success: boolean }) {
  const [params] = useSearchParams();
  const order = params.get('order');
  const orderId = order !== null && /^\d+$/.test(order) ? Number(order) : null;
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  useEffect(() => {
    document.title = success ? 'Thanh toán thành công | ChocoRobot Studio' : 'Thanh toán chưa hoàn tất | ChocoRobot Studio';
  }, [success]);
  async function retry() {
    if (orderId === null || retrying) return;
    setRetrying(true); setRetryError(''); setCheckoutUrl(null);
    try {
      const response = await fetch('/api/checkout/payos/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ orderId }),
        credentials: 'same-origin',
      });
      const body: unknown = await response.json().catch(() => undefined);
      const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
      const data = record(body) && record(body.data) ? body.data : undefined;
      const inner = data && record(data.data) ? data.data : data;
      if (!response.ok || body === undefined || (record(body) && body.success === false)) {
        const message = record(body) && typeof body.message === 'string' && body.message ? body.message : 'Không tạo được link thanh toán mới. Vui lòng thử lại.';
        throw new ApiError(response.status, message);
      }
      const url = inner && typeof inner.checkoutUrl === 'string' ? inner.checkoutUrl : null;
      if (!url) throw new ApiError(502, 'Không tạo được link thanh toán mới. Vui lòng thử lại.');
      setCheckoutUrl(url);
      if (inner && typeof inner.orderCode === 'string') setOrderCode(inner.orderCode);
      if (inner && typeof inner.amount === 'number') setAmount(inner.amount);
    } catch (cause) { setRetryError(cause instanceof Error ? cause.message : 'Không tạo được link thanh toán mới. Vui lòng thử lại.'); }
    finally { setRetrying(false); }
  }
  return <div className="studio-page"><StudioHeader /><main className="studio-request-page studio-checkout">
    <Link className="text-link" to="/trai-nghiem"><ArrowLeft size={18} />Về chỉnh mẫu trên dĩa</Link>
    <div className="studio-page-heading"><div><h1>{success ? 'Cảm ơn bạn đã thanh toán' : 'Thanh toán chưa hoàn tất'}</h1>
      <p>{success ? 'PayOS đã ghi nhận giao dịch. Xưởng sẽ xác nhận đơn hàng của bạn.' : 'Bạn đã hủy hoặc giao dịch chưa thành công. Đơn hàng vẫn được giữ ở trạng thái chờ — bạn có thể tạo mã mới và thanh toán lại ngay bên dưới.'}</p></div></div>
    <div className={success ? 'notice notice-success' : 'notice notice-error'} role="status">
      {success ? <CheckCircle size={20} /> : <WarningCircle size={20} />}
      <span>{success ? `Đơn hàng #${order ?? '—'} đang chờ xưởng xác nhận.` : `Đơn hàng #${order ?? '—'} chưa được thanh toán.`}</span>
    </div>
    {!success && orderId !== null && (checkoutUrl ? <div className="notice notice-success" role="status"><CheckCircle size={20} /><div>
        <p><strong>Mã thanh toán{orderCode ? `: ${orderCode}` : ''}</strong></p>
        {amount !== null && <p>Số tiền cần thanh toán: <strong>{money(amount)}</strong></p>}
        <p>Quét mã QR trên trang PayOS hoặc chuyển khoản đúng số tiền.</p>
      </div><a className="button button-primary" href={checkoutUrl} target="_blank" rel="noreferrer">Mở trang thanh toán PayOS</a></div>
      : <div className="inline-actions">
        <button className="button button-primary" type="button" disabled={retrying} onClick={retry}>{retrying ? 'Đang tạo mã mới…' : 'Thanh toán lại'}<ArrowRight size={18} /></button>
      </div>)}
    {retryError && <div className="notice notice-error" role="alert"><WarningCircle size={20} /><span>{retryError}</span><button type="button" className="button button-secondary" disabled={retrying} onClick={retry}>{retrying ? 'Đang thử lại…' : 'Thử lại'}</button></div>}
    <div className="inline-actions">
      <Link className="button button-secondary" to="/trai-nghiem">Về trang thử mẫu</Link>
    </div>
  </main></div>;
}
