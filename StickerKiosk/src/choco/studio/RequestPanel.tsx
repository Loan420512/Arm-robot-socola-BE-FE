import { ArrowRight, CheckCircle, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listAll, request, useQuery, type Entity } from '../api';
import { money } from '../format';

type Plate = Entity & {
  sku?: string | null;
  typeId?: number | null;
  typeName?: string | null;
  shape?: string | null;
  price?: number | null;
  stockQuantity?: number | null;
  colorId?: number | null;
  colorName?: string | null;
};

type PlateColor = Entity & { isActive?: boolean | null };
type Template = Entity & { plateTypeId?: number | null; templateName?: string | null; isActive?: boolean | null };
type Customer = Entity & { fullName?: string | null; phone?: string | null; email?: string | null };
type OrderReceipt = Entity & { orderCode?: string | null };

type RequestPanelProps = { onCreated?: (orderId: number) => void };

function itemName(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function RequestLoading() {
  return <div className="studio-request-loading" role="status" aria-live="polite"><CircleNotch className="spinner" size={20} aria-hidden="true" />Đang tải các lựa chọn từ xưởng…</div>;
}

export function RequestPanel({ onCreated }: RequestPanelProps) {
  const options = useQuery('studio-request-options', async signal => {
    const [customers, plates, templates, colors] = await Promise.all([
      listAll<Customer>('/admin/customers', signal),
      listAll<Plate>('/plates', signal),
      listAll<Template>('/choco-templates', signal),
      listAll<PlateColor>('/plate-colors', signal),
    ]);
    return { customers, plates, templates, colors };
  });
  const [customerId, setCustomerId] = useState('');
  const [plateId, setPlateId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [created, setCreated] = useState<OrderReceipt | null>(null);
  const mounted = useRef(true);
  const submitting = useRef(false);

  const availablePlates = useMemo(() => {
    const colors = options.data?.colors ?? [];
    return (options.data?.plates ?? []).filter(plate => {
      const color = colors.find(item => item.id === plate.colorId);
      return Number(plate.stockQuantity) > 0 && color?.isActive === true;
    });
  }, [options.data]);
  const selectedPlate = availablePlates.find(plate => plate.id === Number(plateId));
  const compatibleTemplates = useMemo(() => selectedPlate && Number.isSafeInteger(selectedPlate.typeId) && Number(selectedPlate.typeId) > 0
    ? (options.data?.templates ?? []).filter(template => template.isActive === true && template.plateTypeId === selectedPlate.typeId)
    : [], [options.data, selectedPlate]);
  const selectedTemplate = compatibleTemplates.find(template => template.id === Number(templateId));
  const customers = options.data?.customers ?? [];
  const hasOptions = customers.length > 0 && availablePlates.length > 0 && (options.data?.templates ?? []).some(template => template.isActive === true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customers.some(customer => customer.id === Number(customerId)) || !selectedPlate || !selectedTemplate || submitting.current) return;
    submitting.current = true;
    setBusy(true); setSubmitError(''); setCreated(null);
    try {
      const receipt = await request<OrderReceipt | null>('/orders', { method: 'POST', body: JSON.stringify({ customerId: Number(customerId), plateId: selectedPlate.id, chocoTemplateId: selectedTemplate.id }) });
      if (!receipt || !Number.isSafeInteger(receipt.id) || receipt.id < 1) throw new Error('Máy chủ chưa trả về mã đơn hàng hợp lệ.');
      if (mounted.current) { setCreated(receipt); onCreated?.(receipt.id); }
    } catch (error) {
      if (mounted.current) setSubmitError(error instanceof Error ? error.message : 'Không thể tạo yêu cầu. Vui lòng thử lại.');
    } finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }

  if (options.loading) return <RequestLoading />;
  if (options.error) return <div className="studio-request-empty"><div className="notice notice-error" role="alert"><WarningCircle size={20} aria-hidden="true" /><span>{options.error}</span><button className="button button-secondary" onClick={options.reload}>Thử lại</button></div></div>;
  if (!hasOptions) return <div className="studio-request-empty"><WarningCircle size={28} aria-hidden="true" /><h2>Chưa đủ dữ liệu để tạo đơn</h2><p>Cần có khách hàng, dĩa còn hàng với màu đang hoạt động và mẫu chocolate phù hợp. Hãy bổ sung dữ liệu trong khu vực quản trị.</p><div className="inline-actions"><Link className="button button-secondary" to="/quan-ly/customers?new=1">Thêm khách hàng</Link><Link className="button button-secondary" to="/quan-ly/plates?new=1">Thêm dĩa</Link><Link className="button button-secondary" to="/quan-ly/choco-templates?new=1">Thêm mẫu</Link><Link className="button button-ghost" to="/quan-ly/plate-colors">Kiểm tra màu dĩa</Link></div></div>;

  return <section className="studio-request" aria-labelledby="studio-request-title">
    <div className="studio-request-header"><div><h2 id="studio-request-title">Tạo đơn với mẫu có sẵn</h2><p>Chọn dữ liệu trong xưởng để tạo một đơn đang chờ xử lý.</p></div><span className="tag">Admin</span></div>
    <div className="studio-request-note" role="note"><WarningCircle size={19} aria-hidden="true" /><span>Bản xem 3D chỉ là mô phỏng bố cục. Đơn hàng sử dụng mẫu có sẵn bạn chọn bên dưới và chưa chạy robot.</span></div>
    {created ? <div className="studio-request-success" role="status"><CheckCircle size={30} aria-hidden="true" /><div><h3>Đã tạo đơn đang chờ xử lý</h3><p>{created.orderCode ? `Mã đơn ${created.orderCode}` : `Mã đơn #${created.id}`}. Chưa có lệnh robot nào được gửi.</p></div><Link className="button button-secondary" to={`/quan-ly/orders?view=${created.id}`}>Xem đơn hàng <ArrowRight size={17} /></Link><Link className="button button-primary" to="/quan-ly/payments?new=1">Ghi nhận tiền mặt<ArrowRight size={17} /></Link></div> : <form className="studio-request-form" onSubmit={submit} aria-busy={busy}>
      <div className="studio-request-fields">
        <label className="field"><span>Khách hàng</span><select required disabled={busy} value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Chọn khách hàng</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{itemName(customer.fullName, `Khách hàng #${customer.id}`)}{customer.phone ? `, ${customer.phone}` : ''}</option>)}</select></label>
        <label className="field"><span>Dĩa còn hàng</span><select required disabled={busy} value={plateId} onChange={event => { setPlateId(event.target.value); setTemplateId(''); }}><option value="">Chọn dĩa</option>{availablePlates.map(plate => <option key={plate.id} value={plate.id}>{itemName(plate.sku, `Dĩa #${plate.id}`)}, {itemName(plate.typeName, itemName(plate.shape, 'Chưa rõ hình dáng'))}, còn {plate.stockQuantity}</option>)}</select></label>
        <label className="field"><span>Mẫu chocolate đang hoạt động</span><select required disabled={!selectedPlate || busy} value={templateId} onChange={event => setTemplateId(event.target.value)}><option value="">{selectedPlate ? 'Chọn mẫu tương thích' : 'Chọn dĩa trước'}</option>{compatibleTemplates.map(template => <option key={template.id} value={template.id}>{itemName(template.templateName, `Mẫu #${template.id}`)}</option>)}</select></label>
      </div>
      {selectedPlate && !compatibleTemplates.length && <div className="notice" role="status">Chưa có mẫu đang hoạt động phù hợp loại dĩa này. Hãy chọn dĩa khác hoặc <Link className="text-link" to="/quan-ly/choco-templates?new=1">thêm mẫu phù hợp</Link>.</div>}
      {selectedPlate && selectedTemplate && <dl className="studio-request-summary"><div><dt>Dĩa</dt><dd>{itemName(selectedPlate.sku, `#${selectedPlate.id}`)}</dd></div><div><dt>Giá từ dĩa</dt><dd>{money(selectedPlate.price)}</dd></div><div><dt>Mẫu</dt><dd>{itemName(selectedTemplate.templateName, `#${selectedTemplate.id}`)}</dd></div></dl>}
      {submitError && <div className="notice notice-error" role="alert"><WarningCircle size={20} aria-hidden="true" /><span>{submitError} Nếu kết nối gián đoạn, hãy kiểm tra danh sách đơn trước khi gửi lại.</span><Link className="text-link" to="/quan-ly/orders">Kiểm tra đơn hàng</Link></div>}
      <div className="studio-request-actions"><button className="button button-primary" disabled={busy || !customerId || !selectedPlate || !selectedTemplate}>{busy ? <><CircleNotch className="spinner" size={18} aria-hidden="true" />Đang tạo đơn…</> : <>Tạo yêu cầu <ArrowRight size={18} /></>}</button><span>Đơn sẽ ở trạng thái chờ xử lý để Admin xác nhận bước tiếp theo.</span></div>
    </form>}
  </section>;
}
