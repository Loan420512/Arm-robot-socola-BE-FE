import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { registerCustomer } from '../api';
import { useQuery } from '../api';
import { readDraft } from './design';
import { useCatalog } from './catalog';
import { loadTemplateLayout } from './templateLayout';
import { money } from '../format';
import { StudioHeader } from './StudioHeader';
import { CheckoutPayment } from './CheckoutPayment';
import './studio.css';

export default function CheckoutPage() {
  const [draft] = useState(readDraft);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  const catalog = useCatalog();
  const template = catalog.data?.templates.find(item => item.id === draft.templateId && item.isActive === true);
  const plate = catalog.data?.plates.find(item => item.id === draft.plateId && item.typeId === template?.plateTypeId);
  const color = catalog.data?.colors.find(item => item.id === plate?.colorId && item.isActive === true);
  const validSelection = Boolean(!catalog.loading && !catalog.error && template && typeof template.plateTypeId === 'number' && template.plateTypeId > 0 && plate && color && typeof plate.price === 'number' && typeof plate.stockQuantity === 'number' && plate.stockQuantity > 0 && draft.strokes.length === 0);
  const layout = useQuery('checkout-layout:' + (template?.id ?? ''), signal => template ? loadTemplateLayout(template.id, signal) : Promise.resolve({elements:[],strokes:[]}));
  useEffect(() => {
    mounted.current = true;
    document.title = 'Thông tin thanh toán | ChocoRobot Studio';
    return () => { mounted.current = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !validSelection) return;
    if (!fullName.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const receipt = await registerCustomer({ fullName, phone, email });
      if (mounted.current) setCustomerId(receipt.customerId);
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Chưa lưu được thông tin. Vui lòng thử lại.'); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <div className="studio-page"><StudioHeader /><main className="studio-request-page studio-checkout"><Link className="text-link" to="/trai-nghiem"><ArrowLeft size={18} />Về chỉnh mẫu trên dĩa</Link><div className="studio-page-heading"><div><h1>Thông tin và thanh toán</h1><p>Kiểm tra mẫu đã chọn, xem cách thanh toán và để lại thông tin liên hệ.</p></div></div><div className="studio-checkout-grid"><section className="studio-checkout-preview" aria-label="Mẫu đã chọn">{layout.data?.strokes.length ? <svg viewBox="0 0 200 200" role="img" aria-label="Bố cục từ thành phần mẫu trong database"><circle className="studio-pad-plate" cx="100" cy="100" r="96" style={{fill:color?.colorCode}}/>{layout.data.strokes.map(stroke=><path key={stroke.id} fill="none" stroke={stroke.color} strokeWidth={stroke.width*200} strokeLinecap="round" d={stroke.points.map((point,index)=>(index?'L':'M')+(100+point.x*100)+','+(100+point.y*100)).join(' ')}/>)}</svg> : <p className="muted">{layout.loading?'Đang tải bố cục mẫu…':layout.error||'Mẫu chưa có thành phần để xem trước.'}</p>}<h2>{template?.templateName || 'Chưa xác nhận được mẫu'}</h2><dl className="details-grid"><div className="detail-definition"><dt>Dĩa</dt><dd>{plate?.sku || 'Chưa xác nhận được dĩa'}</dd></div><div className="detail-definition"><dt>Màu dĩa</dt><dd>{color?.colorName || 'Chưa có thông tin'}</dd></div><div className="detail-definition"><dt>Giá dĩa</dt><dd>{money(plate?.price)}</dd></div><div className="detail-definition"><dt>Tồn kho</dt><dd>{plate?.stockQuantity ?? 'Chưa có thông tin'}</dd></div></dl><p className="studio-helper">Thông tin được tải lại từ xưởng. Lựa chọn áp dụng mẫu gốc; các điều chỉnh góc và kích thước trong bản xem thử chưa được gửi. Giá cuối cùng cần xác nhận trước khi thu tiền.</p>{catalog.loading && <p role="status">Đang xác minh lựa chọn…</p>}{catalog.error && <div className="notice notice-error" role="alert"><span>{catalog.error}</span><button type="button" className="button button-secondary" onClick={catalog.reload}>Thử lại</button></div>}</section><section className="studio-request">
      <CheckoutPayment price={plate?.price} ready={validSelection} />
      {customerId !== null ? <div className="studio-request-success" role="status"><CheckCircle size={32} /><h2>Đã lưu thông tin liên hệ</h2><p>Mã hồ sơ khách hàng: <strong>#{customerId}</strong>.</p><p>Bản thiết kế vẫn được giữ trên thiết bị này, chưa gửi đến xưởng. Chưa tạo đơn hàng hoặc ghi nhận thanh toán.</p><Link className="button button-secondary" to="/trai-nghiem">Về mẫu đã chọn<ArrowRight size={18} /></Link></div> : <><div className="studio-request-header"><h2>Thông tin của bạn</h2><p>Xưởng dùng thông tin này để liên hệ với bạn.</p></div><form className="studio-request-form" onSubmit={submit} aria-busy={busy}><label className="field"><span>Họ và tên (bắt buộc)</span><input name="fullName" autoComplete="name" required maxLength={100} value={fullName} onChange={event => setFullName(event.target.value)} /></label><label className="field"><span>Số điện thoại (bắt buộc)</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" required pattern="[+]?[0-9]{8,15}" maxLength={16} title="Từ 8 đến 15 chữ số, có thể bắt đầu bằng dấu +" value={phone} onChange={event => setPhone(event.target.value)} /></label><label className="field"><span>Email (bắt buộc)</span><input name="email" type="email" autoComplete="email" required maxLength={100} value={email} onChange={event => setEmail(event.target.value)} /></label><p className="studio-request-note">Hiện có thể lưu thông tin liên hệ. Bản thiết kế chưa được gửi và chưa thu tiền trực tuyến; xưởng cần xác nhận trước khi thanh toán.</p>{error && <div className="notice notice-error" role="alert"><WarningCircle size={20} /><span>{error}</span></div>}<button className="button button-primary" type="submit" disabled={busy || !validSelection || catalog.loading || !!catalog.error}>{busy ? <><span className="spinner" />Đang lưu…</> : <>Lưu thông tin liên hệ<ArrowRight size={18} /></>}</button>{!validSelection && <p className="studio-helper">Chọn mẫu đang hoạt động và dĩa còn hàng từ thư viện trước khi tiếp tục.</p>}</form></>}
    </section></div></main></div>;
}
