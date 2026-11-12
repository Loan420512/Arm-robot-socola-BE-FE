import { Component, lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChartLineUp, CheckCircle, ChefHat, CirclesFour, ClipboardText, Coins, GearSix, List, Palette, Receipt, SignOut, SquaresFour, Users, WarningCircle, X, type Icon } from '@phosphor-icons/react';
import { useAuth } from './auth';
import { CatalogPage } from './CatalogPage';
import { DashboardPage } from './DashboardPage';
import { ResourcePage } from './ResourcePage';
import { TemplatesPage } from './TemplatesPage';
import { PublicHome } from './PublicHome';
import { registerCustomer, request } from './api';
import { RESOURCES } from './resources';

const StudioPage = lazy(() => import('./studio/StudioPage'));
const RequestPage = lazy(() => import('./studio/RequestPage'));
const CheckoutPage = lazy(() => import('./studio/CheckoutPage'));

const groups: { label: string; links: { to: string; label: string; icon: Icon; end?: boolean }[] }[] = [
  { label: 'Không gian làm việc', links: [
    { to: '/quan-tri', label: 'Tổng quan', icon: SquaresFour, end: true },
    { to: '/dia', label: 'Bộ sưu tập dĩa', icon: CirclesFour },
    { to: '/mau-chocolate', label: 'Mẫu chocolate', icon: Palette },
    { to: '/quan-ly/orders', label: 'Đơn hàng', icon: ClipboardText },
  ] },
  { label: 'Vận hành', links: [
    { to: '/quan-ly/customers', label: 'Khách hàng', icon: Users },
    { to: '/quan-ly/payments', label: 'Thanh toán', icon: Receipt },
    { to: '/quan-ly/refunds', label: 'Yêu cầu hoàn tiền', icon: Coins },
    { to: '/quan-ly/cash-flow-audits', label: 'Đối soát thu chi', icon: ChartLineUp },
  ] },
  { label: 'Quản lý xưởng', links: [
    { to: '/danh-muc', label: 'Danh mục & đội ngũ', icon: GearSix },
    { to: '/quan-ly/incident-reports', label: 'Báo cáo sự cố', icon: WarningCircle },
  ] },
];

function Brand({ light = false, workspace = false }: { light?: boolean; workspace?: boolean }) {
  return <Link to={workspace ? '/quan-tri' : '/'} className={`brand${light ? ' brand-light' : ''}`} aria-label={workspace ? 'ChocoRobot, tổng quan quản trị' : 'ChocoRobot, trang chủ'}><span className="brand-symbol"><ChefHat size={24} weight="duotone" /></span><span>choco<span className="brand-lightweight">robot</span><small>Chocolate plate studio</small></span></Link>;
}

function LoadingScreen() {
  return <main className="loading-screen" aria-live="polite"><Brand /><span className="spinner" /><p>Đang mở xưởng chocolate…</p></main>;
}

function Workspace() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const resourceKey = location.pathname.split('/')[2];
  const pageTitle = location.pathname.startsWith('/quan-ly/') && Object.hasOwn(RESOURCES, resourceKey ?? '')
    ? RESOURCES[resourceKey]!.title
    : groups.flatMap(group => group.links).find(item => item.to === location.pathname)?.label
      ?? (location.pathname === '/tai-khoan' ? 'Tài khoản' : 'ChocoRobot');
  useEffect(() => { document.title = `${pageTitle} | ChocoRobot Studio`; }, [pageTitle]);
  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuButton.current;
    const previousOverflow = document.body.style.overflowY;
    document.body.style.overflowY = 'hidden';
    sidebar.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key === 'Tab') {
        const controls = sidebar.current?.querySelectorAll<HTMLElement>('a, button');
        const first = controls?.[0]; const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const wideScreen = window.matchMedia('(min-width: 960px)');
    const resize = () => { if (wideScreen.matches) setMenuOpen(false); };
    document.addEventListener('keydown', keydown); wideScreen.addEventListener('change', resize);
    return () => {
      document.body.style.overflowY = previousOverflow;
      document.removeEventListener('keydown', keydown);
      wideScreen.removeEventListener('change', resize);
      if (!wideScreen.matches && trigger?.isConnected) trigger.focus();
    };
  }, [menuOpen]);
  const [today] = useState(() => new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()));
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/dang-nhap" state={{ from: location.pathname + location.search }} replace />;
  return <div className="workspace" data-js="true">
    <a className="skip-link" href="#main-content">Đến nội dung chính</a>
    {menuOpen && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
    <aside id="workspace-navigation" ref={sidebar} className={`sidebar${menuOpen ? ' sidebar-open' : ''}`} aria-label="Menu không gian làm việc">
      <div className="sidebar-brand"><Brand workspace /><button className="icon-button mobile-only" onClick={() => setMenuOpen(false)} aria-label="Đóng menu"><X size={20} /></button></div>
      <nav className="sidebar-navigation" aria-label="Điều hướng chính">{groups.map(group => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.links.map(item => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><item.icon size={21} weight="duotone" /><span>{item.label}</span><span className="nav-active-mark" /></NavLink>)}</div>)}</nav>
      <div className="sidebar-note"><span className="small-chocolate" aria-hidden="true" /><div><strong>Chăm chút từng chi tiết.</strong><span>Từ chiếc dĩa đến nét chocolate.</span></div></div>
      <div className="sidebar-account"><span className="avatar">{(user.username || 'A').slice(0, 1).toUpperCase()}</span><div><strong>{user.username || 'Quản trị viên'}</strong><span>Quản trị viên</span></div><button className="icon-button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất"><SignOut size={21} /></button></div>
    </aside>
    <div className="workspace-body" inert={menuOpen || undefined}><header className="topbar"><div className="topbar-location"><button ref={menuButton} className="icon-button mobile-only" onClick={() => setMenuOpen(true)} aria-label="Mở menu" aria-controls="workspace-navigation" aria-expanded={menuOpen}><List size={24} /></button><Link className="topbar-label" to="/quan-tri">Không gian làm việc</Link><span className="breadcrumb-slash" aria-hidden="true">/</span><span aria-current="page">{pageTitle}</span></div><div className="topbar-meta"><span className="today-label">{today}</span><Link className="topbar-account" to="/tai-khoan" aria-label="Tài khoản"><GearSix size={18} /><span>Tài khoản</span></Link></div></header><main className="main-content" id="main-content"><Outlet /></main><footer className="workspace-footer"><span>ChocoRobot Studio</span><span>Những món quà mang dấu ấn riêng.</span></footer></div>
  </div>;
}

function AuthShell({ children }: { children: ReactNode }) {
  return <main className="login-page"><section className="login-story"><Brand light /><div className="login-story-copy"><h1>Một chiếc dĩa.<br />Một dấu ấn riêng.</h1><p>Chăm chút từng thiết kế. Quản lý trọn vẹn xưởng chocolate.</p></div><ol className="login-capabilities"><li><CirclesFour size={24} /><div><strong>Dĩa & mẫu chocolate</strong><span>Sắp xếp bộ sưu tập và thiết kế của xưởng.</span></div></li><li><ClipboardText size={24} /><div><strong>Từ tiếp nhận đến hoàn tất</strong><span>Theo dõi đơn hàng qua từng bước xử lý.</span></div></li><li><ChartLineUp size={24} /><div><strong>Thanh toán & đối soát</strong><span>Kiểm tra dòng tiền từ các giao dịch đã ghi nhận.</span></div></li></ol><div className="login-story-footer"><span>ChocoRobot Studio</span><span>Chăm chút từng chi tiết.</span></div></section><section className="login-form-side"><div className="login-form-wrap"><nav className="auth-tabs" aria-label="Truy cập ChocoRobot"><NavLink to="/dang-nhap">Đăng nhập</NavLink><NavLink to="/dang-ky">Đăng ký liên hệ</NavLink></nav>{children}</div><span className="login-bottom">Một chút sáng tạo. Thật nhiều chocolate.</span></section></main>;
}

function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { document.title = 'Đăng nhập Admin | ChocoRobot Studio'; }, []);
  const from = (location.state as { from?: string } | null)?.from;
  const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\') && !from.startsWith('/dang-nhap') ? from : '/quan-tri';
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={destination} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await login(username.trim(), password); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập. Vui lòng thử lại.'); } finally { setBusy(false); }
  }
  return <AuthShell><h2>Đăng nhập Admin</h2><p className="login-description">Quản lý dĩa, mẫu chocolate và đơn hàng trong một không gian.</p><form onSubmit={submit} className="login-form" aria-busy={busy}><label className="field"><span>Tên đăng nhập</span><input name="username" autoComplete="username" required maxLength={100} value={username} onChange={e => setUsername(e.target.value)} placeholder="Tên đăng nhập" aria-describedby={error ? 'login-error' : undefined} /></label><label className="field"><span>Mật khẩu</span><span className="password-input"><input name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={72} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu của bạn" aria-describedby={error ? 'login-error' : undefined} /><button className="password-toggle" type="button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Ẩn' : 'Hiện'}</button></span></label>{error && <div id="login-error" className="notice notice-error" role="alert"><WarningCircle size={20} />{error}</div>}<button className="button button-primary login-submit" disabled={busy}>{busy ? <><span className="spinner" /> Đang đăng nhập…</> : <>Vào không gian làm việc <ArrowRight size={20} /></>}</button></form><p className="login-help"><CheckCircle size={18} />Dành cho quản trị viên. Liên hệ người quản lý để được cấp tài khoản.</p></AuthShell>;
}

function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  useEffect(() => { document.title = 'Đăng ký liên hệ | ChocoRobot Studio'; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!fullName.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    setBusy(true);
    try { const receipt = await registerCustomer({ fullName, phone, email }); setCustomerId(receipt.customerId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không gửi được thông tin. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <AuthShell><h2>Gửi lời chào đến xưởng</h2><p className="login-description">Đăng ký thông tin khách hàng để xưởng có thể liên hệ với bạn. Biểu mẫu này không tạo tài khoản đăng nhập.</p>{customerId !== null ? <section className="auth-success" role="status"><CheckCircle size={32} /><h3>Đã lưu thông tin liên hệ</h3><p>Mã khách hàng của bạn: #{customerId}.</p><p>Cảm ơn bạn đã ghé ChocoRobot.</p><Link className="button button-secondary" to="/dang-nhap">Đến trang đăng nhập</Link></section> : <form className="login-form register-form" onSubmit={submit} aria-busy={busy}><label className="field"><span>Họ và tên (bắt buộc)</span><input name="fullName" autoComplete="name" required maxLength={100} value={fullName} onChange={e => setFullName(e.target.value)} /></label><label className="field"><span>Số điện thoại (bắt buộc)</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={16} pattern="[+]?[0-9]{8,15}" title="Từ 8 đến 15 chữ số, có thể bắt đầu bằng dấu +" aria-describedby="phone-help" value={phone} onChange={e => setPhone(e.target.value)} /><small id="phone-help">Từ 8 đến 15 chữ số, có thể bắt đầu bằng dấu +.</small></label><label className="field"><span>Email (bắt buộc)</span><input name="email" type="email" autoComplete="email" required maxLength={100} value={email} onChange={e => setEmail(e.target.value)} /></label>{error && <div className="notice notice-error" role="alert"><WarningCircle size={20} />{error}</div>}<button className="button button-primary login-submit" disabled={busy}>{busy ? <><span className="spinner" /> Đang gửi…</> : <>Gửi thông tin liên hệ<ArrowRight size={20} /></>}</button><p className="muted">Thông tin được gửi đến xưởng để lưu hồ sơ khách hàng.</p></form>}</AuthShell>;
}

const directory = [
  { key: 'plate-types', label: 'Loại dĩa', description: 'Hình dáng, kích thước và loại dĩa.', icon: CirclesFour },
  { key: 'plate-colors', label: 'Bảng màu dĩa', description: 'Màu sắc và trạng thái sử dụng.', icon: Palette },
  { key: 'template-elements', label: 'Chi tiết mẫu', description: 'Vị trí và tỉ lệ các chi tiết chocolate.', icon: SquaresFour },
  { key: 'staff', label: 'Đội ngũ', description: 'Thông tin và vị trí nhân viên trong xưởng.', icon: ChefHat },
  { key: 'admin', label: 'Quản trị viên', description: 'Quản lý các tài khoản của xưởng.', icon: Users },
  { key: 'incident-reports', label: 'Báo cáo sự cố', description: 'Ghi nhận và theo dõi quá trình xử lý.', icon: WarningCircle },
];

function DirectoryPage() {
  return <><div className="page-heading"><div><h1>Danh mục & đội ngũ</h1><p>Chuẩn bị những điều nhỏ để xưởng vận hành trọn vẹn.</p></div></div><div className="directory-grid">{directory.map(item => <Link to={`/quan-ly/${item.key}`} className="directory-card card" key={item.key}><span className="directory-icon"><item.icon size={27} weight="duotone" /></span><h2>{item.label}</h2><p>{item.description}</p><ArrowUpRight size={21} className="directory-arrow" /></Link>)}</div></>;
}

function ResourceRoute() { const { resourceKey = '' } = useParams(); return <ResourcePage key={resourceKey} resourceKey={resourceKey} />; }

function AccountPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrent] = useState(''); const [newPassword, setNew] = useState(''); const [confirmPassword, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận chưa khớp.'); return; }
    if (new TextEncoder().encode(newPassword).length > 72) { setError('Mật khẩu quá dài. Hãy dùng tối đa 72 byte UTF-8.'); return; }
    setBusy(true);
    try { await request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }); setMessage('Đã thay đổi mật khẩu.'); setCurrent(''); setNew(''); setConfirm(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đổi mật khẩu.'); } finally { setBusy(false); }
  }
  return <><div className="page-heading"><div><h1>Tài khoản</h1><p>Thông tin đăng nhập và mật khẩu quản trị viên.</p></div></div><div className="account-layout"><section className="card account-card"><span className="avatar avatar-large">{user?.username?.slice(0, 1).toUpperCase() || 'A'}</span><h2>{user?.username}</h2><p>{user?.email || 'Chưa có email'}</p><span className="tag">Quản trị viên</span></section><form className="card account-form" onSubmit={submit}><h2>Đổi mật khẩu</h2><p className="muted">Sử dụng ít nhất 12 ký tự cho mật khẩu mới.</p><label className="field"><span>Mật khẩu hiện tại</span><input type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrent(e.target.value)} /></label><label className="field"><span>Mật khẩu mới</span><input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={newPassword} onChange={e => setNew(e.target.value)} /></label><label className="field"><span>Xác nhận mật khẩu mới</span><input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmPassword} onChange={e => setConfirm(e.target.value)} /></label>{error && <div className="notice notice-error" role="alert">{error}</div>}{message && <div className="notice notice-success" role="status">{message}</div>}<div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</button></div></form></div></>;
}

function NotFoundPage() { return <main className="not-found"><Brand /><h1>Không tìm thấy trang</h1><p>Quay về trang chủ để tiếp tục khám phá ChocoRobot.</p><Link className="button button-primary" to="/">Về trang chủ <ArrowRight size={18} /></Link></main>; }

class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="loading-screen"><Brand /><h1>Không thể mở trang.</h1><p>Vui lòng tải lại để tiếp tục làm việc.</p><button className="button button-primary" onClick={() => window.location.reload()}>Tải lại trang</button></main> : this.props.children; }
}

export function ChocoApp() {
  return <AppBoundary><Suspense fallback={<LoadingScreen />}><Routes>
    <Route path="/" element={<PublicHome />} />
    <Route path="/trai-nghiem" element={<StudioPage />} />
    <Route path="/yeu-cau-xit" element={<RequestPage />} />
    <Route path="/thanh-toan-mau" element={<CheckoutPage />} />
    <Route path="/dang-nhap" element={<LoginPage />} />
    <Route path="/dang-ky" element={<RegisterPage />} />
    <Route element={<Workspace />}>
      <Route path="/quan-tri" element={<DashboardPage />} />
      <Route path="/dia" element={<CatalogPage />} />
      <Route path="/mau-chocolate" element={<TemplatesPage />} />
      <Route path="/quan-ly/:resourceKey" element={<ResourceRoute />} />
      <Route path="/danh-muc" element={<DirectoryPage />} />
      <Route path="/tai-khoan" element={<AccountPage />} />
      <Route path="/thiet-ke" element={<Navigate to="/mau-chocolate" replace />} />
      <Route path="/sticker" element={<Navigate to="/mau-chocolate" replace />} />
      <Route path="/don-hang/*" element={<Navigate to="/quan-ly/orders" replace />} />
      <Route path="/thanh-toan" element={<Navigate to="/quan-ly/payments" replace />} />
      <Route path="/quan-tri/*" element={<Navigate to="/quan-tri" replace />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></AppBoundary>;
}
