import { useDeferredValue, useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, MagnifyingGlass, Package, Plus, SlidersHorizontal, X } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { list, listAll, useQuery, type Entity } from './api';
import { money } from './format';
import { PlateArt } from './PlateArt';

interface Plate extends Entity {
  id: number;
  typeId: number | null;
  colorId: number | null;
  sku: string | null;
  material: string | null;
  color: string | null;
  price: number | null;
  stockQuantity: number | null;
  typeName: string | null;
  shape: string | null;
  dimensions: string | null;
  colorName: string | null;
  colorCode: string | null;
}

interface PlateType extends Entity {
  id: number;
  typeName: string | null;
}

interface PlateColor extends Entity {
  id: number;
  colorName: string | null;
}

function PlateDetail({ plate, onClose }: { plate: Plate; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog className="dialog product-dialog" ref={dialog} onClose={() => { if (!dialog.current?.open) onClose(); }} aria-labelledby={titleId}>
      <div className="dialog-header">
        <div><h2 id={titleId}>{plate.sku || `Dĩa #${plate.id}`}</h2></div>
        <button className="close-button button button-ghost" type="button" onClick={onClose} aria-label="Đóng thông tin dĩa"><X size={20} /></button>
      </div>
      <div className="product-detail-visual"><PlateArt color={plate.colorCode} shape={plate.shape} /></div>
      <dl className="details-grid">
        <div className="detail-definition"><dt>Loại dĩa</dt><dd>{plate.typeName || 'Chưa có thông tin'}</dd></div>
        <div className="detail-definition"><dt>Hình dáng</dt><dd>{plate.shape || 'Chưa có thông tin'}</dd></div>
        <div className="detail-definition"><dt>Kích thước</dt><dd>{plate.dimensions || 'Chưa có thông tin'}</dd></div>
        <div className="detail-definition"><dt>Chất liệu</dt><dd>{plate.material || 'Chưa có thông tin'}</dd></div>
        <div className="detail-definition"><dt>Màu sắc</dt><dd>{plate.colorName || plate.color || 'Chưa có thông tin'}</dd></div>
        <div className="detail-definition"><dt>Tồn kho</dt><dd>{plate.stockQuantity == null ? 'Chưa có tồn kho' : `${plate.stockQuantity} dĩa`}</dd></div>
      </dl>
      <div className="product-detail-note muted">Hình minh họa hình dáng và màu dĩa. Kích thước thực tế theo thông tin sản phẩm.</div>
      <div className="product-footer dialog-footer">
        <strong className="product-price">{money(plate.price)}</strong>
        <Link className="button button-primary" to={`/quan-ly/plates?edit=${plate.id}`}>Chỉnh sửa dĩa<ArrowRight size={17} /></Link>
      </div>
    </dialog>
  );
}

export function CatalogPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [typeId, setTypeId] = useState('');
  const [colorId, setColorId] = useState('');
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Plate | null>(null);
  const options = useQuery('plate-filter-options', async signal => {
    const [types, colors] = await Promise.all([
      listAll<PlateType>('/plate-types', signal),
      listAll<PlateColor>('/plate-colors', signal),
    ]);
    return { types, colors };
  });
  const queryKey = JSON.stringify({ search: deferredSearch, typeId, colorId, inStock, page });
  const plates = useQuery(queryKey, signal => list<Plate>('/plates', {
    search: deferredSearch || undefined,
    typeId: typeId ? Number(typeId) : undefined,
    colorId: colorId ? Number(colorId) : undefined,
    inStock: inStock || undefined,
    pageNumber: page,
    pageSize: 12,
  }, signal));
  const hasFilters = Boolean(search || typeId || colorId || inStock);

  function resetFilters() {
    setSearch('');
    setTypeId('');
    setColorId('');
    setInStock(false);
    setPage(1);
  }

  return (
    <div className="catalog-page">
      <div className="page-heading">
        <div className="heading-copy"><h1>Bộ sưu tập dĩa</h1><p className="muted">Quản lý hình dáng, màu sắc và tồn kho cho mỗi thiết kế chocolate.</p></div>
        <div className="page-actions"><Link className="button button-primary" to="/quan-ly/plates?new=1"><Plus size={18} />Thêm dĩa mới</Link></div>
      </div>
      <div className="catalog-summary">
        <span><strong>{plates.data?.totalCount ?? '—'}</strong> dĩa{hasFilters ? ' phù hợp' : ' trong danh mục'}</span>
        <div className="inline-actions"><Link className="button button-ghost" to="/quan-ly/plate-types">Loại dĩa<ArrowRight size={15} /></Link><Link className="button button-ghost" to="/quan-ly/plate-colors">Bảng màu<ArrowRight size={15} /></Link></div>
      </div>
      <form className="catalog-toolbar toolbar" onSubmit={event => event.preventDefault()} aria-label="Tìm và lọc dĩa">
        <label className="search-field"><MagnifyingGlass size={19} aria-hidden="true" /><span className="sr-only">Tìm dĩa</span><input type="search" className="search-input" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm mã dĩa, chất liệu…" maxLength={200} /></label>
        <label className="field compact-field"><span>Loại dĩa</span><select value={typeId} onChange={event => { setTypeId(event.target.value); setPage(1); }}><option value="">Tất cả loại</option>{options.data?.types.map(type => <option value={type.id} key={type.id}>{type.typeName || `Loại #${type.id}`}</option>)}</select></label>
        <label className="field compact-field"><span>Màu sắc</span><select value={colorId} onChange={event => { setColorId(event.target.value); setPage(1); }}><option value="">Tất cả màu</option>{options.data?.colors.map(color => <option value={color.id} key={color.id}>{color.colorName || `Màu #${color.id}`}</option>)}</select></label>
        <label className="filter-toggle"><input type="checkbox" checked={inStock} onChange={event => { setInStock(event.target.checked); setPage(1); }} />Chỉ còn hàng</label>
      </form>
      {options.error && <div className="notice notice-error" role="alert">Không tải được bộ lọc. {options.error}<button className="button button-ghost" onClick={options.reload}>Thử lại</button></div>}
      {plates.error && <div className="notice notice-error" role="alert">{plates.error}<button className="button button-secondary" onClick={plates.reload}>Thử lại</button></div>}
      {plates.loading ? <div role="status" aria-live="polite"><span className="sr-only">Đang tải danh mục dĩa…</span><div className="catalog-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className="catalog-skeleton" key={index}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /></div>)}</div></div> : plates.data && plates.data.items.length === 0 ? (
        <div className="empty-state catalog-empty">
          <div className="empty-illustration"><PlateArt /></div>
          <h2>{hasFilters ? 'Chưa tìm thấy chiếc dĩa phù hợp' : 'Bộ sưu tập đang chờ chiếc dĩa đầu tiên'}</h2>
          <p>{hasFilters ? 'Thử đổi từ khóa hoặc bỏ bớt bộ lọc để xem thêm sản phẩm.' : 'Bắt đầu với loại dĩa và bảng màu, sau đó thêm sản phẩm cùng giá và tồn kho.'}</p>
          {hasFilters ? <button className="button button-secondary" onClick={resetFilters}><SlidersHorizontal size={18} />Xóa bộ lọc</button> : <div className="inline-actions"><Link className="button button-primary" to="/quan-ly/plates?new=1"><Plus size={18} />Thêm dĩa mới</Link><Link className="button button-secondary" to="/quan-ly/plate-types">Tạo loại dĩa</Link></div>}
        </div>
      ) : plates.data && (
        <>
          <div className="catalog-grid">
            {plates.data.items.map(plate => <article className="plate-card" key={plate.id}>
              <button className="plate-visual" type="button" onClick={() => setSelected(plate)} aria-label={`Xem thông tin ${plate.sku || `dĩa ${plate.id}`}`}><PlateArt color={plate.colorCode} shape={plate.shape} /><span className="plate-view-hint">Xem chi tiết<ArrowRight size={17} /></span></button>
              <div className="product-meta">
                <div className="product-kicker">{plate.typeName || 'Dĩa'}{plate.shape ? ` / ${plate.shape}` : ''}</div>
                <h2 className="product-title"><button type="button" onClick={() => setSelected(plate)}>{plate.sku || `Dĩa #${plate.id}`}</button></h2>
                <p className="product-specs">{[plate.material, plate.dimensions].filter(Boolean).join(', ') || 'Chưa có thông số'}</p>
                <div className="plate-color-label"><span className="color-swatch" style={{ backgroundColor: /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(plate.colorCode ?? '') ? plate.colorCode! : undefined }} aria-hidden="true" />{plate.colorName || plate.color || 'Chưa có màu'}</div>
                <div className="product-footer"><strong className="product-price">{money(plate.price)}</strong><span className={`stock-label${plate.stockQuantity != null && plate.stockQuantity > 0 ? '' : ' stock-empty'}`}><Package size={15} aria-hidden="true" />{plate.stockQuantity == null ? 'Chưa có tồn kho' : plate.stockQuantity > 0 ? `Còn ${plate.stockQuantity}` : 'Hết hàng'}</span></div>
              </div>
            </article>)}
          </div>
          {plates.data.totalPages > 1 && <nav className="pagination" aria-label="Phân trang dĩa"><span>Trang {plates.data.pageNumber} / {plates.data.totalPages}</span><div className="inline-actions"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Trước</button><button className="button button-secondary" disabled={page >= plates.data.totalPages} onClick={() => setPage(current => current + 1)}>Tiếp</button></div></nav>}
        </>
      )}
      {selected && <PlateDetail plate={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
