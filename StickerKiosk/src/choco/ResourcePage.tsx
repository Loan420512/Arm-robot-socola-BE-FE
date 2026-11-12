import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowSquareOut, Plus, X } from '@phosphor-icons/react';
import { list, listAll, request, useQuery } from './api';
import type { Entity } from './api';
import { useAuth } from './auth';
import { dateTime, money, statusLabel } from './format';
import { OPTION_LABELS, RESOURCES, incidentTransitions, initialValues, orderTransitions, recordLabel, referenceOptions, resourcePayload, validateResource } from './resources';
import type { FormValues, ReferenceData, ResourceColumn, ResourceDefinition, ResourceField } from './resources';

type RowAction = { label: string; path: string; body?: Record<string, unknown>; danger?: boolean; description: string; method?: 'DELETE' | 'PATCH' };
type Modal = { kind: 'form'; record: Entity | null } | { kind: 'view'; record: Entity } | { kind: 'confirm'; record: Entity; action: RowAction };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}

function displayOption(value: string): string {
  return OPTION_LABELS[value] ?? statusLabel(value);
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function valueDisplay(resource: ResourceDefinition, column: ResourceColumn, row: Entity, references: ReferenceData): ReactNode {
  const value = row[column.key];
  if (value === null || value === undefined || value === '') return <span className="muted">Chưa có</span>;
  if (column.format === 'money') return money(Number(value));
  if (column.format === 'date') return dateTime(String(value));
  if (column.format === 'status') return <span className={`status-badge status-${String(value).toLowerCase().replaceAll(' ', '-')}`}>{statusLabel(String(value))}</span>;
  if (column.format === 'boolean' || typeof value === 'boolean') return <span className={`status-badge ${value ? 'status-active' : 'status-inactive'}`}>{value ? 'Hoạt động' : 'Tạm ngưng'}</span>;
  if (column.format === 'image') {
    const url = safeUrl(value);
    return url ? <img className="template-thumb" src={url} alt={String(row.templateName ?? 'Ảnh mẫu chocolate')} loading="lazy" referrerPolicy="no-referrer" /> : <span className="muted">Chưa có ảnh</span>;
  }
  if (column.format === 'color') return <span className="color-label">{String(value)}</span>;
  const field = resource.fields.find(item => item.key === column.key);
  if (field?.reference) {
    const referenced = references[field.reference]?.find(item => item.id === Number(value));
    return referenced ? recordLabel(field.reference, referenced) : `#${String(value)}`;
  }
  if (field?.kind === 'select') return displayOption(String(value));
  if (/Url$/.test(column.key)) {
    const url = safeUrl(value);
    return url ? <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Mở tệp <ArrowSquareOut size={16} aria-hidden="true" /></a> : String(value);
  }
  return String(value);
}

function actionsFor(resourceKey: string, row: Entity): RowAction[] {
  if (resourceKey === 'orders') return orderTransitions(row.status).map(status => ({
    label: status === 'Processing' ? 'Bắt đầu xử lý' : status === 'Completed' ? 'Hoàn thành' : 'Hủy đơn',
    path: `/orders/${row.id}/status`, body: { status }, danger: status === 'Cancelled',
    description: status === 'Processing' ? 'Bắt đầu xử lý đơn hàng và trừ một dĩa trong kho?' : status === 'Completed' ? 'Xác nhận đơn hàng đã hoàn thành? Sau bước này, trạng thái không thể đổi.' : row.status === 'Processing' ? 'Hủy đơn hàng này? Một dĩa sẽ được trả về kho.' : 'Hủy đơn hàng đang chờ này?',
  }));
  if (resourceKey === 'refunds' && row.status === 'Pending') return [
    { label: 'Phê duyệt', path: `/refunds/${row.id}/approve`, description: 'Phê duyệt yêu cầu hoàn tiền? Bước này chỉ duyệt yêu cầu, chưa xác nhận tiền đã được chuyển hoàn.' },
    { label: 'Từ chối', path: `/refunds/${row.id}/reject`, description: 'Từ chối yêu cầu hoàn tiền này? Quyết định đã lưu không thể thay đổi.', danger: true },
  ];
  if (resourceKey === 'staff' || resourceKey === 'plate-colors') return [{
    label: row.isActive === true ? 'Tạm ngưng' : 'Kích hoạt', path: `${RESOURCES[resourceKey]!.path}/${row.id}/status`, body: { isActive: row.isActive !== true },
    description: `${row.isActive === true ? 'Tạm ngưng' : 'Kích hoạt lại'} ${RESOURCES[resourceKey]!.singular} này?`,
  }];
  if (resourceKey === 'incident-reports') return incidentTransitions(row.status).map(status => ({
    label: status === 'In Progress' ? 'Tiếp nhận xử lý' : 'Đã giải quyết', path: `/incident-reports/${row.id}/status`, body: { status },
    description: status === 'In Progress' ? 'Chuyển sự cố sang đang xử lý?' : 'Xác nhận sự cố đã được giải quyết?',
  }));
  return [];
}

export function ResourcePage({ resourceKey }: { resourceKey: string }) {
  const resource = Object.hasOwn(RESOURCES, resourceKey) ? RESOURCES[resourceKey] : undefined;
  if (!resource) return <div className="empty-state"><h1>Không tìm thấy trang</h1><p>Vui lòng chọn một mục trong menu.</p></div>;
  return <ResourceContent key={resourceKey} resourceKey={resourceKey} resource={resource} />;
}

function ResourceContent({ resourceKey, resource }: { resourceKey: string; resource: ResourceDefinition }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('q') ?? '').slice(0, 200);
  const requestedPage = Number(searchParams.get('page'));
  const pageNumber = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedSize = Number(searchParams.get('pageSize'));
  const pageSize = [10, 20, 50].includes(requestedSize) ? requestedSize : 10;
  const [search, setSearch] = useState(filter);
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const titleId = useId();

  const records = useQuery(`${resourceKey}:${pageNumber}:${pageSize}:${filter}:${revision}`, signal => list<Entity>(resource.path, { pageNumber, pageSize, search: filter || undefined, sortBy: 'id', descending: true }, signal));
  const referenceKeys = [...new Set([...resource.fields.map(field => field.reference).filter((key): key is string => !!key), ...(resource.extraReferences ?? [])])];
  const relations = useQuery<ReferenceData>(`${resourceKey}:references:${revision}`, async signal => {
    const entries = await Promise.all(referenceKeys.map(async key => [key, await listAll<Entity>(RESOURCES[key]!.path, signal)] as const));
    return Object.fromEntries(entries);
  });
  const references = relations.data ?? {};
  const selectedPlatePrice = references.plates?.find(row => row.id === Number(values.plateId))?.price;
  const rows = records.data?.items ?? [];
  const totalCount = records.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const editing = modal?.kind === 'form' && !!modal.record;
  const fields = resource.fields.filter(field => editing || !field.editOnly);
  const formReferencesLoading = relations.loading && referenceKeys.length > 0;
  const canSubmit = !busy && !uploading && !formReferencesLoading && !relations.error;

  function setPageNumber(next: number | ((current: number) => number)) {
    setSearchParams(current => {
      const params = new URLSearchParams(current);
      const page = typeof next === 'function' ? next(pageNumber) : next;
      if (page <= 1) params.delete('page'); else params.set('page', String(page));
      return params;
    });
  }

  function changePageSize(size: number) {
    setSearchParams(current => {
      const params = new URLSearchParams(current);
      if (size === 10) params.delete('pageSize'); else params.set('pageSize', String(size));
      params.delete('page');
      return params;
    });
  }

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Keep the draft search aligned with browser back/forward navigation.
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => { setSearch(filter); }, [filter]);
  /* oxlint-enable react/set-state-in-effect */

  useEffect(() => {
    if (search.trim() === filter) return;
    const timeout = window.setTimeout(() => {
      setSearchParams(current => {
        const params = new URLSearchParams(current);
        const query = search.trim();
        if (query) params.set('q', query); else params.delete('q');
        params.delete('page');
        return params;
      }, { replace: true });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, filter, setSearchParams]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal && !dialog.open) dialog.showModal();
    if (!modal && dialog.open) dialog.close();
  }, [modal]);

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  // Browser navigation can request a dialog while this resource page is already mounted.
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    const detailKey = searchParams.has('view') ? 'view' : searchParams.has('edit') ? 'edit' : null;
    if (!detailKey) setDetailLoading(false);
    if (searchParams.has('new')) {
      setValues(initialValues(resource, null)); setFormError(null); setModal({ kind: 'form', record: null });
      const next = new URLSearchParams(searchParams); next.delete('new'); setSearchParams(next, { replace: true });
    } else if (detailKey) {
      const rawId = searchParams.get(detailKey) ?? '';
      if (!/^[1-9]\d*$/.test(rawId) || !Number.isSafeInteger(Number(rawId))) {
        setDetailError('Mã bản ghi không hợp lệ.');
      } else {
        setDetailLoading(true); setDetailError(null);
        void request<Entity>(`${resource.path}/${rawId}`, { signal: controller.signal }).then(row => {
          if (controller.signal.aborted) return;
          if (detailKey === 'view') {
            setFormError(null); setModal({ kind: 'view', record: row });
          } else if (!resource.canEdit || (resourceKey === 'orders' && row.status !== 'Pending')) {
            setDetailError('Bản ghi này không thể chỉnh sửa ở trạng thái hiện tại.');
          } else {
            setValues(initialValues(resource, row)); setFormError(null); setModal({ kind: 'form', record: row });
          }
          const next = new URLSearchParams(searchParams); next.delete(detailKey); setSearchParams(next, { replace: true });
        }).catch(error => { if (!controller.signal.aborted) setDetailError(errorMessage(error)); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
      }
    }
    return () => controller.abort();
  }, [resource, resourceKey, searchParams, setSearchParams]);
  /* oxlint-enable react/set-state-in-effect */

  function openForm(record: Entity | null) {
    setValues(initialValues(resource, record)); setFormError(null); setModal({ kind: 'form', record });
  }

  async function openDetails(row: Entity) {
    setDetailLoading(true); setDetailError(null);
    try {
      const record = await request<Entity>(`${resource.path}/${row.id}`);
      if (mounted.current) { setFormError(null); setModal({ kind: 'view', record }); }
    } catch (error) { if (mounted.current) setDetailError(errorMessage(error)); }
    finally { if (mounted.current) setDetailLoading(false); }
  }

  function changeValue(field: ResourceField, value: string | boolean) {
    setValues(current => {
      const next = { ...current, [field.key]: value };
      if (resourceKey === 'plates' && field.key === 'colorId') next.color = String(references['plate-colors']?.find(item => item.id === Number(value))?.colorName ?? '');
      if (resourceKey === 'orders' && field.key === 'plateId') next.chocoTemplateId = '';
      if (resourceKey === 'payments' && field.key === 'orderId') {
        next.amount = String(references.orders?.find(item => item.id === Number(value))?.totalAmount ?? '');
        next.cashReceivedConfirmed = false;
      }
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.kind !== 'form' || !canSubmit) return;
    const validation = validateResource(resourceKey, values, references);
    if (validation) { setFormError(validation); return; }
    for (const field of fields.filter(field => field.kind === 'reference')) {
      const chosenId = values[field.key];
      if (chosenId && !referenceOptions(resourceKey, field, values, references, modal.record?.id).some(item => item.id === Number(chosenId))) {
        setFormError(`${field.label} không còn phù hợp. Hãy chọn lại hoặc tải lại dữ liệu.`); return;
      }
    }
    const payload = resourcePayload(resource, values, !!modal.record, references);
    setBusy(true); setFormError(null);
    try {
      await request(`${resource.path}${modal.record ? `/${modal.record.id}` : ''}`, { method: modal.record ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      if (!mounted.current) return;
      setNotice(`Đã ${modal.record ? 'cập nhật' : 'thêm'} ${resource.singular}.`);
      setModal(null); setRevision(current => current + 1);
    } catch (error) { if (mounted.current) setFormError(errorMessage(error)); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setFormError('Vui lòng chọn ảnh PNG hoặc JPEG.'); return; }
    if (file.size > 5 * 1024 * 1024) { setFormError('Ảnh không được lớn hơn 5 MB.'); return; }
    const body = new FormData(); body.set('File', file);
    setUploading(true); setFormError(null);
    try {
      const result = await request<{ imagePreviewUrl: string }>('/choco-templates/upload-image', { method: 'POST', body });
      if (mounted.current) setValues(current => ({ ...current, imagePreviewUrl: result.imagePreviewUrl }));
    } catch (error) { if (mounted.current) setFormError(errorMessage(error)); }
    finally { if (mounted.current) setUploading(false); }
  }

  function confirm(row: Entity, action: RowAction) {
    setFormError(null); setModal({ kind: 'confirm', record: row, action });
  }

  async function executeAction() {
    if (modal?.kind !== 'confirm' || busy) return;
    setBusy(true); setFormError(null);
    try {
      await request(modal.action.path, { method: modal.action.method ?? 'PATCH', ...(modal.action.body ? { body: JSON.stringify(modal.action.body) } : {}) });
      if (!mounted.current) return;
      setNotice('Đã lưu thay đổi.'); setModal(null);
      if (rows.length === 1 && pageNumber > 1 && modal.action.method === 'DELETE') setPageNumber(current => current - 1);
      setRevision(current => current + 1);
    } catch (error) { if (mounted.current) setFormError(errorMessage(error)); }
    finally { if (mounted.current) setBusy(false); }
  }

  function renderField(field: ResourceField) {
    const id = `${resourceKey}-${field.key}`;
    const helpId = `${id}-help`;
    const currentValue = values[field.key] ?? '';
    const disabled = busy || uploading;
    if (field.kind === 'checkbox') return <label className="field field-checkbox" key={field.key} htmlFor={id}>
      <input id={id} name={field.key} type="checkbox" checked={currentValue === true} required={field.required} onChange={event => changeValue(field, event.target.checked)} disabled={disabled} />
      <span>{field.label}{field.required ? ' *' : ''}</span>
    </label>;
    let options = field.options ?? [];
    if (resourceKey === 'incident-reports' && field.key === 'status') options = editing ? [String(modal?.record?.status ?? 'Open'), ...incidentTransitions(modal?.record?.status)] : ['Open'];
    const shared = { id, name: field.key, required: field.required, disabled, 'aria-describedby': field.help ? helpId : undefined };
    let input: ReactNode;
    if (field.kind === 'reference') {
      const choices = referenceOptions(resourceKey, field, values, references, modal?.record?.id);
      const retainedValue = currentValue !== '' && !choices.some(item => item.id === Number(currentValue));
      const retainedRecord = references[field.reference ?? '']?.find(item => item.id === Number(currentValue));
      input = <select {...shared} disabled={disabled || formReferencesLoading || !!relations.error} value={String(currentValue)} onChange={event => changeValue(field, event.target.value)}>
        <option value="">{formReferencesLoading ? 'Đang tải…' : field.required ? `Chọn ${field.label.toLowerCase()}` : 'Không gắn phiếu đối soát'}</option>
        {retainedValue && <option value={String(currentValue)} disabled>{retainedRecord ? recordLabel(field.reference ?? '', retainedRecord) : `#${String(currentValue)}`} (cần chọn lại)</option>}
        {choices.map(item => <option key={item.id} value={item.id}>{recordLabel(field.reference ?? '', item)}{field.reference === 'orders' ? `, ${money(typeof item.totalAmount === 'number' ? item.totalAmount : undefined)}` : field.reference === 'payments' ? `, ${money(typeof item.amount === 'number' ? item.amount : undefined)}` : ''}</option>)}
      </select>;
    } else if (field.kind === 'select') {
      input = <select {...shared} value={String(currentValue)} onChange={event => changeValue(field, event.target.value)}>
        <option value="" disabled>Chọn {field.label.toLowerCase()}</option>
        {options.map(option => <option key={option} value={option}>{displayOption(option)}</option>)}
      </select>;
    } else if (field.kind === 'textarea') {
      input = <textarea {...shared} rows={4} maxLength={field.maxLength} value={String(currentValue)} onChange={event => changeValue(field, event.target.value)} />;
    } else {
      const color = field.key === 'color' ? references['plate-colors']?.find(item => item.id === Number(values.colorId))?.colorName : undefined;
      input = <input {...shared} type={field.kind ?? 'text'} value={String(color ?? currentValue)} onChange={event => changeValue(field, event.target.value)} maxLength={field.maxLength} minLength={field.minLength} min={field.min} max={field.max} step={field.step} pattern={field.pattern} placeholder={field.placeholder} readOnly={field.readOnly} autoComplete={field.kind === 'password' ? 'new-password' : 'off'} />;
    }
    return <div className={`field ${field.kind === 'textarea' ? 'field-wide' : ''}`} key={field.key}>
      <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>{input}
      {field.help && <small className="muted" id={helpId}>{field.help}</small>}
      {field.kind === 'reference' && !formReferencesLoading && !relations.error && !referenceOptions(resourceKey, field, values, references, modal?.record?.id).length && <small className="muted">{resourceKey === 'orders' && field.key === 'chocoTemplateId' && !values.plateId ? 'Chọn dĩa trước để xem mẫu phù hợp.' : `Chưa có ${field.label.toLowerCase()} phù hợp. Tạo dữ liệu ở mục tương ứng rồi tải lại.`}</small>}
    </div>;
  }

  const detailColumns = modal?.kind === 'view' ? Object.keys(modal.record).filter(key => !/password|secret|token/i.test(key)).map(key => resource.columns.find(column => column.key === key) ?? { key, label: resource.fields.find(field => field.key === key)?.label ?? ({ id: 'ID', createdAt: 'Ngày tạo', reportedAt: 'Thời gian báo cáo', adminId: 'Quản trị viên', gcodeFileUrl: 'Tệp đính kèm', transactionId: 'Mã giao dịch', paidAt: 'Thời gian nhận' } as Record<string, string>)[key] ?? key, ...(/At$|Date$/.test(key) ? { format: 'date' as const } : {}) }) : [];

  return <>
    <div className="page-heading"><div><h1>{resource.title}</h1><p>{resource.description}</p></div><button className="button button-primary" onClick={() => openForm(null)}><Plus size={18} aria-hidden="true" />Thêm {resource.singular}</button></div>
    {notice && <div className="notice notice-success" role="status">{notice}<button className="button button-ghost" aria-label="Đóng thông báo" onClick={() => setNotice(null)}><X size={18} aria-hidden="true" /></button></div>}
    {resource.note && <p className="resource-note muted">{resource.note}</p>}
    {detailLoading && <p role="status">Đang mở bản ghi…</p>}
    {detailError && <div className="notice notice-error" role="alert">{detailError}</div>}
    <section className="card table-panel" aria-label={`Danh sách ${resource.singular}`} aria-busy={records.loading}>
      <div className="toolbar"><label className="search-input"><span className="sr-only">Tìm trong {resource.title.toLowerCase()}</span><input type="search" value={search} maxLength={200} onChange={event => setSearch(event.target.value)} placeholder={`Tìm ${resource.singular}…`} /></label>{!records.loading && !records.error && <span className="resource-count" role="status">{totalCount} bản ghi</span>}<button className="button button-secondary" onClick={() => { records.reload(); relations.reload(); }} disabled={records.loading}>Làm mới</button></div>
      {records.error ? <div className="empty-state notice-error" role="alert"><h2>Chưa tải được dữ liệu</h2><p>{errorMessage(records.error)}</p><button className="button button-secondary" onClick={records.reload}>Thử lại</button></div> : records.loading ? <div className="table-loading" role="status" aria-live="polite"><p>Đang tải {resource.singular}…</p>{[0, 1, 2, 3].map(row => <div className="table-skeleton-row" key={row} aria-hidden="true"><span /><span /><span /></div>)}</div> : !rows.length ? <div className="empty-state"><span className="empty-symbol" aria-hidden="true">◇</span><h2>{filter ? 'Không tìm thấy kết quả' : `Chưa có ${resource.singular}`}</h2><p>{filter ? 'Thử một từ khóa khác hoặc xóa tìm kiếm.' : `Thêm ${resource.singular} đầu tiên để bắt đầu quản lý.`}</p><button className="button button-secondary" onClick={() => filter ? setSearch('') : openForm(null)}>{filter ? 'Xóa tìm kiếm' : `Thêm ${resource.singular}`}</button></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">ID</th>{resource.columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}<th scope="col">Thao tác</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
        <td><button className="button button-ghost" onClick={() => void openDetails(row)} disabled={detailLoading} aria-label={`Xem ${resource.singular} số ${row.id}`}>#{row.id}</button></td>
        {resource.columns.map(column => <td key={column.key}>{valueDisplay(resource, column, row, references)}</td>)}
        <td><div className="inline-actions"><button className="button button-ghost" onClick={() => void openDetails(row)} disabled={detailLoading}>Xem</button>
          {resource.canEdit && (resourceKey !== 'orders' || row.status === 'Pending') && <button className="button button-ghost" onClick={() => openForm(row)}>Sửa</button>}
          {actionsFor(resourceKey, row).map(action => <button key={action.path + String(action.body?.status ?? '')} className={`button ${action.danger ? 'button-danger' : 'button-secondary'}`} onClick={() => confirm(row, action)}>{action.label}</button>)}
          {resource.canDelete && <button className="button button-ghost" disabled={resourceKey === 'admin' && row.id === user?.id} title={resourceKey === 'admin' && row.id === user?.id ? 'Bạn không thể xóa tài khoản đang đăng nhập.' : undefined} onClick={() => confirm(row, { label: 'Xóa', method: 'DELETE', path: `${resource.path}/${row.id}`, danger: true, description: `Xóa ${recordLabel(resourceKey, row)}? Thao tác này không thể hoàn tác. Bản ghi đang được tham chiếu sẽ không thể xóa.` })}>Xóa</button>}
        </div></td></tr>)}</tbody></table></div>}
      {!records.error && !records.loading && <div className="pagination"><span className="muted">{totalCount} bản ghi{totalCount ? `, trang ${pageNumber}/${totalPages}` : ''}</span><label>Số dòng <select value={pageSize} onChange={event => changePageSize(Number(event.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label><div className="inline-actions"><button className="button button-secondary" disabled={pageNumber <= 1 || records.loading} onClick={() => setPageNumber(current => current - 1)}>Trước</button><button className="button button-secondary" disabled={pageNumber >= totalPages || records.loading} onClick={() => setPageNumber(current => current + 1)}>Sau</button></div></div>}
    </section>
    {relations.error && <div className="notice notice-error" role="alert">Chưa tải được dữ liệu liên quan: {errorMessage(relations.error)} <button className="button button-secondary" onClick={relations.reload}>Thử lại</button></div>}
    <dialog ref={dialogRef} className="dialog" aria-labelledby={titleId} onCancel={event => { if (busy || uploading) event.preventDefault(); else setModal(null); }} onClose={() => setModal(null)}>
      {modal && <><div className="dialog-heading"><div><h2 id={titleId}>{modal.kind === 'form' ? `${modal.record ? 'Chỉnh sửa' : 'Thêm'} ${resource.singular}` : modal.kind === 'view' ? `Chi tiết ${resource.singular}` : modal.action.label}</h2></div><button className="button button-ghost" aria-label="Đóng hộp thoại" disabled={busy || uploading} onClick={() => setModal(null)}><X size={20} aria-hidden="true" /></button></div>
        {formError && <div ref={formErrorRef} className="notice notice-error" tabIndex={-1} role="alert">{formError}</div>}
        {modal.kind === 'form' && <form onSubmit={event => void save(event)}>
          {resource.note && <p className="muted">{resource.note}</p>}
          {relations.error && <div className="notice notice-error" role="alert">Chưa tải được các lựa chọn. <button type="button" className="button button-secondary" onClick={relations.reload}>Thử lại</button></div>}
          <div className="form-grid">{fields.map(renderField)}</div>
          {resourceKey === 'orders' && values.plateId && <p className="notice">Tổng tiền dự kiến: <strong>{money(typeof selectedPlatePrice === 'number' ? selectedPlatePrice : undefined)}</strong></p>}
          {resourceKey === 'choco-templates' && <div className="template-upload"><label className="field"><span>Tải ảnh xem trước</span><input type="file" accept="image/png,image/jpeg" disabled={busy || uploading} onChange={event => { void uploadImage(event.target.files?.[0]); event.target.value = ''; }} /><small className="muted">PNG/JPEG, tối đa 5 MB. Ảnh sẽ được tải lên trước khi lưu mẫu.</small></label>{uploading && <p role="status">Đang tải ảnh…</p>}{safeUrl(values.imagePreviewUrl) && <img className="template-preview" src={safeUrl(values.imagePreviewUrl)} alt="Xem trước mẫu chocolate" referrerPolicy="no-referrer" />}</div>}
          <p className="muted">* Thông tin bắt buộc</p><div className="form-actions"><button type="button" className="button button-secondary" disabled={busy || uploading} onClick={() => setModal(null)}>Hủy</button><button type="submit" className="button button-primary" disabled={!canSubmit}>{busy ? 'Đang lưu…' : uploading ? 'Đang tải ảnh…' : formReferencesLoading ? 'Đang tải lựa chọn…' : editing ? 'Lưu thay đổi' : resourceKey === 'payments' ? 'Ghi nhận tiền đã nhận' : `Thêm ${resource.singular}`}</button></div>
        </form>}
        {modal.kind === 'view' && <><dl className="detail-grid">{detailColumns.map(column => <div key={column.key}><dt className="muted">{column.label}</dt><dd>{valueDisplay(resource, column, modal.record, references)}</dd></div>)}</dl><div className="form-actions"><button className="button button-secondary" onClick={() => setModal(null)}>Đóng</button>{resource.canEdit && (resourceKey !== 'orders' || modal.record.status === 'Pending') && <button className="button button-primary" onClick={() => openForm(modal.record)}>Chỉnh sửa</button>}</div></>}
        {modal.kind === 'confirm' && <><p>{modal.action.description}</p><div className="form-actions"><button className="button button-secondary" disabled={busy} onClick={() => setModal(null)}>Quay lại</button><button className={`button ${modal.action.danger ? 'button-danger' : 'button-primary'}`} disabled={busy} onClick={() => void executeAction()}>{busy ? 'Đang lưu…' : modal.action.label}</button></div></>}
      </>}
    </dialog>
  </>;
}

export default ResourcePage;
