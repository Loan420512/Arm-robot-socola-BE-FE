import { ArrowRight, ArrowUpRight, ChefHat, Image, Plus, WarningCircle } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from './api';
import { useAuth } from './auth';
import { loadTemplates, type CatalogTemplate } from './studio/catalog';
import './public.css';

const steps = [
  { title: 'Bắt đầu từ chiếc dĩa', description: 'Trao đổi cùng xưởng về hình dáng, màu sắc và chiếc dĩa bạn thích.' },
  { title: 'Chọn một lời muốn gửi', description: 'Mang theo cảm hứng, họa tiết hoặc lời nhắn để cùng xưởng tìm bố cục phù hợp.' },
  { title: 'Chăm chút cùng xưởng', description: 'Xác nhận thiết kế, loại dĩa còn sẵn và giá trước khi đặt.' },
];

const questions = [
  { question: 'Tôi có cần đăng nhập để chọn mẫu không?', answer: 'Trang chủ và studio mở công khai. Bạn chỉ nhập thông tin liên hệ ở bước thanh toán, không cần tài khoản Customer.' },
  { question: 'Mẫu và hình ảnh trên website lấy từ đâu?', answer: 'Thư viện hiển thị tên và ảnh mẫu từ dữ liệu của xưởng. Khi chưa tải được thư viện hoặc chưa có mẫu, trang sẽ thông báo rõ.' },
  { question: 'Tôi có thể thêm một lời nhắn riêng không?', answer: 'Bạn có thể trao đổi lời nhắn với nhân viên. Nội dung và độ dài phù hợp sẽ được xác nhận cùng thiết kế thực tế.' },
  { question: 'Khi nào đơn hàng được xác nhận?', answer: 'Xưởng cần xác nhận thiết kế, dĩa còn sẵn và giá trước khi nhận đơn. Việc lưu thông tin liên hệ chưa có nghĩa đã thanh toán.' },
];

function TemplateImage({ template, hero = false }: { template: CatalogTemplate; hero?: boolean }) {
  void hero;
  const label = template.templateName?.trim() || 'Mẫu #' + template.id;
  return <div className="home-plate-mini" aria-hidden="true"><span>{label}</span></div>;
}

function HeroPlate({ name }: { name: string }) {
  return <div className="home-plate" aria-hidden="true"><span className="home-plate-script">{name}</span></div>;
}

function HomeBrand() {
  return <Link to="/" className="brand home-brand" aria-label="ChocoRobot, trang chủ"><span className="brand-symbol"><ChefHat size={27} weight="duotone" aria-hidden="true" /></span><span>choco<span className="brand-lightweight">robot</span><small>Chocolate plate studio</small></span></Link>;
}

export function PublicHome() {
  const { user } = useAuth();
  const library = useQuery(`home-templates:${user?.id ?? 'guest'}`, loadTemplates);
  const templates = library.data?.filter(template => template.isActive === true) ?? [];
  const featured = templates[0];
  useEffect(() => { document.title = 'ChocoRobot, chocolate theo cách của bạn'; }, []);
  return <div className="public-home">
    <a className="skip-link" href="#home-main">Đến nội dung chính</a>
    <header className="home-header home-container"><HomeBrand /><nav className="home-nav" aria-label="Điều hướng trang chủ"><a href="#home-inspiration">Thư viện mẫu</a><Link to="/trai-nghiem">Thử mẫu 3D</Link><a href="#home-faq">Giải đáp</a></nav><Link className="button button-secondary home-login" to="/dang-nhap">Đăng nhập Admin<ArrowUpRight size={17} aria-hidden="true" /></Link></header>
    <main id="home-main">
      <section className="home-hero home-container" aria-labelledby="home-hero-title">
        <div className="home-hero-copy"><h1 id="home-hero-title">Một món quà<br />rất riêng.</h1><p>Một chiếc dĩa, vài nét chocolate, một lời thương.</p><div className="home-actions"><Link className="button button-primary" to="/trai-nghiem">Thử mẫu trên dĩa<ArrowRight size={18} aria-hidden="true" /></Link><a className="home-link" href="#home-how">Cùng xưởng bắt đầu</a></div></div>
        <section className="home-feature" aria-label="Mẫu chocolate của xưởng">{featured ? <><div className="home-feature-visual"><HeroPlate name={featured.templateName?.trim() || `Mẫu #${featured.id}`} /></div><div className="home-feature-caption"><h2>{featured.templateName?.trim() || `Mẫu #${featured.id}`}</h2><Link className="home-link" to={`/trai-nghiem?template=${featured.id}`}>Xem mẫu trên dĩa<ArrowRight size={17} aria-hidden="true" /></Link></div></> : <div className="home-feature-intro"><Image size={40} weight="light" aria-hidden="true" /><h2>Thư viện chocolate của xưởng</h2><p>{library.loading ? 'Đang tải mẫu chocolate…' : library.error ? 'Mẫu sẽ xuất hiện khi thư viện sẵn sàng.' : 'Xưởng chưa có mẫu chocolate đang sử dụng.'}</p><a className="home-link" href="#home-inspiration">Xem thư viện<ArrowRight size={17} aria-hidden="true" /></a></div>}</section>
      </section>
      <section className="home-inspiration home-container" id="home-inspiration" aria-labelledby="home-inspiration-title"><div className="home-section-heading"><h2 id="home-inspiration-title">Mẫu chocolate của xưởng</h2><p>Chọn từ thư viện mẫu đang sử dụng.</p></div>
        {library.loading ? <div className="home-library-loading" role="status" aria-live="polite"><span className="sr-only">Đang tải thư viện mẫu chocolate…</span><div className="home-inspiration-grid" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <div className="home-template-skeleton" key={index}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /></div>)}</div></div> : library.error ? <div className="home-library-state" role="alert"><WarningCircle size={30} weight="light" aria-hidden="true" /><div><h3>Thư viện mẫu chưa thể tải</h3><p>{library.error}</p></div><button className="button button-secondary" type="button" onClick={library.reload}>Thử lại</button></div> : templates.length === 0 ? <div className="home-library-state"><Image size={30} weight="light" aria-hidden="true" /><div><h3>Chưa có mẫu chocolate đang sử dụng</h3><p>Mẫu sẽ hiển thị khi xưởng cập nhật thư viện.</p></div></div> : <div className="home-inspiration-grid">{templates.map(template => <article className="home-inspiration-item" key={template.id}><Link className="home-inspiration-art" to={`/trai-nghiem?template=${template.id}`} aria-label={`Xem mẫu ${template.templateName?.trim() || template.id} trên dĩa 3D`}><TemplateImage template={template} /></Link><div className="home-inspiration-copy"><h3>{template.templateName?.trim() || `Mẫu #${template.id}`}</h3><Link className="home-link" to={`/trai-nghiem?template=${template.id}`}>Xem trên dĩa 3D<ArrowRight size={17} aria-hidden="true" /></Link></div></article>)}</div>}
      </section>
      <section className="home-process" id="home-how" aria-labelledby="home-how-title"><div className="home-container"><div className="home-section-heading"><h2 id="home-how-title">Từ ý tưởng đến món quà</h2><p>Bạn chọn mẫu. Xưởng cùng bạn chăm chút phần còn lại.</p></div><ol className="home-process-grid">{steps.map((step, index) => <li key={step.title}><span className="home-process-number" aria-hidden="true">0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol></div></section>
      <section className="home-faq home-container" id="home-faq" aria-labelledby="home-faq-title"><div className="home-faq-intro"><h2 id="home-faq-title">Trước khi bắt đầu</h2><p>Một vài điều để bạn yên tâm chọn món quà của mình.</p></div><div className="home-faq-list">{questions.map(item => <details key={item.question}><summary><span>{item.question}</span><Plus size={20} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div></section>
      <section className="home-contact" aria-labelledby="home-contact-title"><div className="home-container home-contact-inner"><div><h2 id="home-contact-title">Một lời chào. Một ý tưởng mới.</h2><p>Để lại thông tin để xưởng có thể liên hệ với bạn.</p></div><Link to="/dang-ky" className="button button-primary">Gửi thông tin liên hệ<ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>
    </main>
    <footer className="home-footer home-container"><div><HomeBrand /><p>Một chút sáng tạo. Thật nhiều chocolate.</p></div><nav aria-label="Điều hướng cuối trang"><a href="#home-inspiration">Thư viện mẫu</a><a href="#home-faq">Giải đáp</a><Link to="/quan-tri">Quản trị xưởng</Link></nav><span className="home-footer-note">Chăm chút từng chi tiết.</span></footer>
  </div>;
}
