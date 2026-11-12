import { useDeferredValue, useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, MagnifyingGlass, PaintBrush, Plus, Stack, X } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { list, listAll, useQuery, type Entity } from './api';
import { dateTime } from './format';
import { PlateArt } from './PlateArt';
import { TemplateArtwork } from './studio/TemplateArtwork';

interface ChocolateTemplate extends Entity {
  id: number;
  plateTypeId: number | null;
  staffId: number | null;
  templateName: string | null;
  imagePreviewUrl: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface PlateType extends Entity {
  id: number;
  typeName: string | null;
  shape: string | null;
  dimensions: string | null;
}

interface TemplateElement extends Entity {
  id: number;
  elementName: string | null;
  positionX: number | null;
  positionY: number | null;
  scale: number | null;
}

interface Staff extends Entity {
  id: number;
  fullName: string | null;
  employeeCode: string | null;
}

function TemplatePreview({ template, large = false }: { template: ChocolateTemplate; large?: boolean }) {
  return <TemplateArtwork templateId={template.id} name={template.templateName||'Mẫu #'+template.id} className={large?'template-image template-image-large':'template-image'}/>;
}

function TemplateDetail({ template, plateType, designer, onClose }: { template: ChocolateTemplate; plateType: PlateType | undefined; designer: Staff | undefined; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const elements = useQuery(`template-elements-${template.id}`, signal => listAll<TemplateElement>(`/template-elements/by-template/${template.id}`, signal));
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog className="dialog template-dialog" ref={dialog} onClose={() => { if (!dialog.current?.open) onClose(); }} aria-labelledby={titleId}>
      <div className="dialog-header"><div><h2 id={titleId}>{template.templateName || `Mẫu #${template.id}`}</h2></div><button className="button button-ghost close-button" type="button" onClick={onClose} aria-label="Đóng thông tin mẫu"><X size={20} /></button></div>
      <div className="template-workspace">
        <div className="template-detail-art"><TemplatePreview template={template} large /></div>
        <div className="template-info"><span className={`status-badge ${template.isActive ? 'status-success' : 'status-neutral'}`}>{template.isActive ? 'Đang sử dụng' : 'Tạm ngưng'}</span><dl className="details-grid">
          <div className="detail-definition"><dt>Loại dĩa tương thích</dt><dd>{plateType?.typeName || `Loại dĩa #${template.plateTypeId ?? '—'}`}</dd></div>
          <div className="detail-definition"><dt>Kích thước dĩa</dt><dd>{plateType?.dimensions || 'Chưa có thông tin'}</dd></div>
          <div className="detail-definition"><dt>Người thiết kế</dt><dd>{designer?.fullName || (template.staffId ? `Nhân viên #${template.staffId}` : 'Chưa có thông tin')}</dd></div>
          <div className="detail-definition"><dt>Ngày tạo</dt><dd>{dateTime(template.createdAt)}</dd></div>
        </dl><div className="template-actions"><Link className="button button-primary" to={`/quan-ly/choco-templates?edit=${template.id}`}>Chỉnh sửa mẫu<ArrowRight size={17} /></Link></div></div>
      </div>
      <section className="template-elements-section" aria-label="Thành phần thiết kế">
        <div className="section-heading"><h3>Thành phần thiết kế</h3><Link className="button button-ghost" to="/quan-ly/template-elements">Quản lý thành phần<ArrowRight size={15} /></Link></div>
        {elements.loading ? <p className="muted" role="status">Đang tải thành phần…</p> : elements.error ? <div className="notice notice-error" role="alert">{elements.error}<button className="button button-ghost" onClick={elements.reload}>Thử lại</button></div> : elements.data?.length ? <div className="table-panel"><table className="data-table"><thead><tr><th scope="col">Tên thành phần</th><th scope="col">Vị trí X</th><th scope="col">Vị trí Y</th><th scope="col">Tỉ lệ</th></tr></thead><tbody>{elements.data.map(element => <tr key={element.id}><td>{element.elementName || `Thành phần #${element.id}`}</td><td>{element.positionX ?? '—'}</td><td>{element.positionY ?? '—'}</td><td>{element.scale ?? '—'}</td></tr>)}</tbody></table></div> : <div className="notice"><Stack size={19} aria-hidden="true" /><p>Mẫu này chưa có thành phần thiết kế. Bạn có thể bổ sung vị trí và tỉ lệ trong phần quản lý.</p></div>}
      </section>
    </dialog>
  );
}

export function TemplatesPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [plateTypeId, setPlateTypeId] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ChocolateTemplate | null>(null);
  const options = useQuery('template-reference-options', async signal => {
    const [types, staff] = await Promise.all([
      listAll<PlateType>('/plate-types', signal),
      listAll<Staff>('/staff', signal),
    ]);
    return { types, staff };
  });
  const key = JSON.stringify({ search: deferredSearch, plateTypeId, activeOnly, page });
  const templates = useQuery(key, signal => list<ChocolateTemplate>('/choco-templates', {
      search: deferredSearch || undefined,
      plateTypeId: plateTypeId ? Number(plateTypeId) : undefined,
      isActive: activeOnly || undefined,
      pageNumber: page,
      pageSize: 12,
    }, signal));
  const hasFilters = Boolean(search || plateTypeId || activeOnly);

  return (
    <div className="templates-page">
      <div className="page-heading"><div className="heading-copy"><h1>Thư viện mẫu chocolate</h1><p className="muted">Lưu mẫu trang trí, ảnh xem trước và thành phần thiết kế theo từng loại dĩa.</p></div><div className="page-actions"><Link className="button button-primary" to="/quan-ly/choco-templates?new=1"><Plus size={18} />Thêm mẫu mới</Link></div></div>
      <div className="catalog-summary"><span><strong>{templates.data?.totalCount ?? '—'}</strong> mẫu{hasFilters ? ' phù hợp' : ' trong thư viện'}</span><Link className="button button-ghost" to="/quan-ly/template-elements"><Stack size={17} />Thành phần thiết kế<ArrowRight size={15} /></Link></div>
      <form className="catalog-toolbar toolbar" onSubmit={event => event.preventDefault()} aria-label="Tìm và lọc mẫu chocolate">
        <label className="search-field"><MagnifyingGlass size={19} aria-hidden="true" /><span className="sr-only">Tìm mẫu chocolate</span><input className="search-input" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm theo tên mẫu…" maxLength={200} /></label>
        <label className="field compact-field"><span>Loại dĩa</span><select value={plateTypeId} onChange={event => { setPlateTypeId(event.target.value); setPage(1); }}><option value="">Tất cả loại dĩa</option>{options.data?.types.map(type => <option value={type.id} key={type.id}>{type.typeName || `Loại #${type.id}`}</option>)}</select></label>
        <label className="filter-toggle"><input type="checkbox" checked={activeOnly} onChange={event => { setActiveOnly(event.target.checked); setPage(1); }} />Chỉ mẫu đang sử dụng</label>
      </form>
      {options.error && <div className="notice notice-error" role="alert">Không tải được thông tin loại dĩa và người thiết kế. {options.error}<button className="button button-ghost" onClick={options.reload}>Thử lại</button></div>}
      {templates.error && <div className="notice notice-error" role="alert">{templates.error}<button className="button button-secondary" onClick={templates.reload}>Thử lại</button></div>}
      {templates.loading ? <div role="status" aria-live="polite"><span className="sr-only">Đang mở thư viện mẫu…</span><div className="template-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className="catalog-skeleton" key={index}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /></div>)}</div></div> : templates.data && templates.data.items.length === 0 ? <div className="empty-state catalog-empty"><div className="empty-illustration"><PlateArt decorated /></div><h2>{hasFilters ? 'Chưa tìm thấy mẫu phù hợp' : 'Câu chuyện đầu tiên bắt đầu từ một mẫu'}</h2><p>{hasFilters ? 'Thử một tên khác hoặc đổi bộ lọc loại dĩa.' : 'Thêm mẫu chocolate, chọn loại dĩa và bố cục các thành phần thiết kế.'}</p>{hasFilters ? <button className="button button-secondary" onClick={() => { setSearch(''); setPlateTypeId(''); setActiveOnly(false); setPage(1); }}>Xóa bộ lọc</button> : <Link className="button button-primary" to="/quan-ly/choco-templates?new=1"><PaintBrush size={18} />Thêm mẫu đầu tiên</Link>}</div> : templates.data && <><div className="template-grid">{templates.data.items.map(template => {
        const type = options.data?.types.find(item => item.id === template.plateTypeId);
        return <article className="template-card" key={template.id}><button className="template-preview" type="button" onClick={() => setSelected(template)} aria-label={`Xem mẫu ${template.templateName || template.id}`}><TemplatePreview template={template} /><span className="plate-view-hint">Xem thiết kế<ArrowRight size={17} /></span></button><div className="product-meta"><div className="template-type product-kicker">{type?.typeName || `Loại dĩa #${template.plateTypeId ?? '—'}`}</div><h2 className="product-title"><button type="button" onClick={() => setSelected(template)}>{template.templateName || `Mẫu #${template.id}`}</button></h2><div className="product-footer"><span className={`status-badge ${template.isActive ? 'status-success' : 'status-neutral'}`}>{template.isActive ? 'Đang sử dụng' : 'Tạm ngưng'}</span><button className="button button-ghost" type="button" onClick={() => setSelected(template)} aria-label={`Xem chi tiết ${template.templateName || `mẫu ${template.id}`}`}><ArrowRight size={20} /></button></div></div></article>;
      })}</div>{templates.data.totalPages > 1 && <nav className="pagination" aria-label="Phân trang mẫu chocolate"><span>Trang {templates.data.pageNumber} / {templates.data.totalPages}</span><div className="inline-actions"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Trước</button><button className="button button-secondary" disabled={page >= templates.data.totalPages} onClick={() => setPage(current => current + 1)}>Tiếp</button></div></nav>}</>}
      {selected && <TemplateDetail template={selected} plateType={options.data?.types.find(type => type.id === selected.plateTypeId)} designer={options.data?.staff.find(staff => staff.id === selected.staffId)} onClose={() => setSelected(null)} />}
    </div>
  );
}
