import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChartLineUp, ClipboardText, Plus, WarningCircle } from '@phosphor-icons/react';
import { list, request, useQuery, type Entity } from './api';
import { dateTime, money, statusLabel } from './format';

interface Overview { totalCustomers: number; totalOrders: number; completedOrders: number; pendingOrders: number; totalRevenue: number; totalRefunds: number }
interface Revenue { date: string; total: number }
interface Order extends Entity { orderCode: string | null; totalAmount: number | null; status: string | null; createdAt: string | null }
interface Statistics { status: string | null; count: number }

function QueryError({ message, reload }: { message: string; reload: () => void }) {
  return <div className="panel-error"><div className="notice notice-error" role="alert"><WarningCircle size={20} aria-hidden="true" /><span>{message}</span><button className="button button-ghost" onClick={reload}>Thử lại</button></div></div>;
}

function LedgerSkeleton() {
  return <div className="table-loading" role="status"><p>Đang tải đơn hàng…</p>{Array.from({ length: 4 }, (_, index) => <div className="table-skeleton-row" aria-hidden="true" key={index}><span /><span /><span /></div>)}</div>;
}

function RevenueChart({ values }: { values: Revenue[] }) {
  const recent = values.slice(-14);
  if (!recent.length) return <div className="chart-empty"><ChartLineUp size={32} weight="light" aria-hidden="true" /><strong>Chưa có doanh thu được ghi nhận</strong><span>Dữ liệu xuất hiện sau khi đơn hàng được thanh toán.</span></div>;
  const lower = Math.min(0, ...recent.map(item => item.total));
  const upper = Math.max(1, ...recent.map(item => item.total));
  const x = (index: number) => recent.length === 1 ? 300 : 28 + index * 544 / (recent.length - 1);
  const y = (total: number) => 154 - (total - lower) / (upper - lower) * 126;
  const points = recent.map((item, index) => `${x(index)},${y(item.total)}`).join(' ');
  return <div className="revenue-chart"><svg viewBox="0 0 600 188" role="img" aria-label={`Doanh thu ${recent.length} ngày có thanh toán gần nhất`}>{[28, 91, 154].map(y => <line x1="28" x2="572" y1={y} y2={y} key={y} className="chart-grid" />)}<polyline points={points} className="chart-line" />{recent.map((item, index) => <circle key={item.date} cx={x(index)} cy={y(item.total)} r="4" className="chart-point"><title>{new Date(item.date).toLocaleDateString('vi-VN')}: {money(item.total)}</title></circle>)}</svg><div className="chart-labels"><span>{new Date(recent[0].date).toLocaleDateString('vi-VN')}</span><span>{new Date(recent[recent.length - 1].date).toLocaleDateString('vi-VN')}</span></div></div>;
}

export function DashboardPage() {
  const overview = useQuery('dashboard-overview', signal => request<Overview>('/dashboard/overview', { signal }));
  const revenue = useQuery('dashboard-revenue', signal => request<Revenue[]>('/dashboard/revenue', { signal }));
  const orders = useQuery('dashboard-recent-orders', signal => list<Order>('/orders', { pageSize: 5, sortBy: 'CreatedAt', descending: true }, signal));
  const statistics = useQuery('dashboard-order-statistics', signal => request<Statistics[]>('/dashboard/orders-statistics', { signal }));
  const stats = overview.data;
  const orderStatistics = statistics.data;
  const totalOrders = orderStatistics?.reduce((total, item) => total + item.count, 0) ?? 0;
  return <>
    <div className="page-heading"><div><h1>Tổng quan xưởng</h1><p>Theo dõi đơn hàng, doanh thu và hoạt động ChocoRobot.</p></div><Link to="/quan-ly/orders?new=1" className="button button-primary"><Plus size={19} aria-hidden="true" />Tạo đơn hàng</Link></div>
    {overview.error ? <QueryError message={overview.error} reload={overview.reload} /> : <section className="stats-grid" aria-label="Số liệu tổng quan" aria-busy={overview.loading}>{[
      { title: 'Doanh thu ròng', value: stats ? money(stats.totalRevenue) : '', note: 'Từ thanh toán đã ghi nhận' },
      { title: 'Tổng đơn hàng', value: stats?.totalOrders, note: stats ? `${stats.completedOrders} đơn đã hoàn tất` : '' },
      { title: 'Đơn chờ xử lý', value: stats?.pendingOrders, note: 'Chờ tiếp nhận tại xưởng' },
      { title: 'Khách hàng', value: stats?.totalCustomers, note: 'Thông tin đã đăng ký' },
    ].map(item => <article className="stat-card" key={item.title}><div className="stat-top">{item.title}</div>{overview.loading ? <><div className="skeleton skeleton-number" aria-hidden="true" /><div className="skeleton skeleton-line" aria-hidden="true" /></> : <><strong className="stat-value">{item.value}</strong><span className="stat-note">{item.note}</span></>}</article>)}</section>}
    <section className="card recent-orders" aria-labelledby="recent-orders-heading"><div className="panel-heading"><div><h2 id="recent-orders-heading">Đơn hàng gần đây</h2><p>Chọn một đơn để xem chi tiết và bước xử lý tiếp theo.</p></div><Link to="/quan-ly/orders" className="text-link">Xem tất cả <ArrowUpRight size={17} aria-hidden="true" /></Link></div>{orders.loading ? <LedgerSkeleton /> : orders.error ? <QueryError message={orders.error} reload={orders.reload} /> : orders.data && orders.data.items.length === 0 ? <div className="empty-state compact-empty"><ClipboardText size={32} weight="light" aria-hidden="true" /><h3>Chưa có đơn hàng</h3><p>Tạo đơn khi khách đã chọn dĩa và mẫu chocolate.</p><Link className="button button-secondary" to="/quan-ly/orders?new=1"><Plus size={17} aria-hidden="true" />Tạo đơn đầu tiên</Link></div> : orders.data && <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Mã đơn hàng</th><th scope="col">Ngày tạo</th><th scope="col">Giá trị</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Chi tiết</span></th></tr></thead><tbody>{orders.data.items.map(order => <tr key={order.id}><td><strong>{order.orderCode || `#${order.id}`}</strong></td><td>{dateTime(order.createdAt)}</td><td>{money(order.totalAmount)}</td><td><span className={`status-badge status-${order.status?.toLowerCase()}`}>{statusLabel(order.status || '')}</span></td><td><Link className="icon-button" aria-label={`Xem đơn ${order.orderCode || order.id}`} to={`/quan-ly/orders?view=${order.id}`}><ArrowUpRight size={18} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>}</section>
    <div className="dashboard-panels"><section className="card revenue-panel" aria-labelledby="revenue-heading"><div className="panel-heading"><div><h2 id="revenue-heading">Nhịp doanh thu</h2><p>Những ngày có thanh toán gần nhất</p></div><span className="tag">VND</span></div>{revenue.loading ? <div className="chart-empty" role="status"><div className="skeleton skeleton-number" aria-hidden="true" /><span>Đang tải doanh thu…</span></div> : revenue.error ? <QueryError message={revenue.error} reload={revenue.reload} /> : revenue.data && <RevenueChart values={revenue.data} />}</section>
    <section className="card progress-panel" aria-labelledby="order-status-heading"><div className="panel-heading"><div><h2 id="order-status-heading">Trạng thái đơn hàng</h2><p>Từ tiếp nhận đến hoàn tất</p></div></div>{statistics.loading ? <div className="table-loading" role="status"><p>Đang tải trạng thái đơn…</p>{Array.from({ length: 4 }, (_, i) => <div className="skeleton skeleton-line" aria-hidden="true" key={i} />)}</div> : statistics.error ? <QueryError message={statistics.error} reload={statistics.reload} /> : statistics.data && <div className="order-progress">{['Pending', 'Processing', 'Completed', 'Cancelled'].map(status => { const count = orderStatistics?.find(item => item.status === status)?.count ?? 0; return <div className="progress-row" key={status}><div><span className="status-label">{statusLabel(status)}</span><strong>{count}</strong></div><div className="progress-track"><span className={`progress-fill status-${status.toLowerCase()}`} style={{ transform: `scaleX(${totalOrders ? Math.min(1, count / totalOrders) : 0})` }} /></div></div>; })}</div>}<Link className="text-link" to="/quan-ly/orders">Quản lý đơn hàng <ArrowRight size={17} aria-hidden="true" /></Link></section></div>
    <div className="dashboard-actions"><p>Chuẩn bị dĩa và mẫu thiết kế trước khi tiếp nhận đơn.</p><Link className="button button-secondary" to="/mau-chocolate">Khám phá mẫu chocolate <ArrowRight size={17} aria-hidden="true" /></Link></div>
    <section className="getting-started"><h2>Chuẩn bị & vận hành</h2><div className="quick-links"><Link to="/quan-ly/plate-types?new=1"><span className="quick-number">01</span><div><strong>Chuẩn bị chiếc dĩa</strong><p>Thêm loại dĩa, màu sắc và sản phẩm.</p></div><ArrowUpRight size={21} aria-hidden="true" /></Link><Link to="/mau-chocolate"><span className="quick-number">02</span><div><strong>Chăm chút mẫu chocolate</strong><p>Quản lý hình ảnh và từng chi tiết mẫu.</p></div><ArrowUpRight size={21} aria-hidden="true" /></Link><Link to="/quan-ly/orders"><span className="quick-number">03</span><div><strong>Gửi đi một món quà</strong><p>Theo dõi đơn hàng và thanh toán.</p></div><ArrowUpRight size={21} aria-hidden="true" /></Link></div></section>
  </>;
}
