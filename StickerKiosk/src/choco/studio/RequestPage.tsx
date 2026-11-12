import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '../auth';
import { readDraft } from './design';
import { RequestPanel } from './RequestPanel';
import { StudioHeader } from './StudioHeader';
import './studio.css';

export default function RequestPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  useEffect(() => { document.title = 'Yêu cầu xịt chocolate | ChocoRobot Studio'; }, []);
  if (loading) return <main className="loading-screen" role="status"><span className="spinner" /><p>Đang xác minh phiên đăng nhập…</p></main>;
  if (!user) return <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />;
  const draft = readDraft();
  return <div className="studio-page"><StudioHeader /><main className="studio-request-page"><Link className="text-link" to="/trai-nghiem"><ArrowLeft size={18} />Về bản xem 3D</Link><div className="studio-page-heading"><div><h1>Yêu cầu xịt chocolate</h1><p>Chọn khách hàng, dĩa và mẫu của xưởng để tạo đơn chờ xử lý.</p></div></div><p className="studio-draft-summary">Bản xem thử đã giữ: <strong>{draft.templateId ? 'Mã mẫu #' + draft.templateId : 'Chưa chọn mẫu của xưởng'}</strong>, kích thước {Math.round(draft.size * 100)}%, góc {draft.rotation}°.</p><RequestPanel /></main></div>;
}
