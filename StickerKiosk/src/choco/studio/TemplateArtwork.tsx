import { useQuery } from '../api';
import { loadTemplateLayout } from './templateLayout';

export function TemplateArtwork({ templateId, name, className = '' }: { templateId: number; name: string; className?: string }) {
  const layout = useQuery('template-artwork:' + templateId, signal => loadTemplateLayout(templateId, signal));
  if (layout.loading) return <div className={'template-element-artwork-state ' + className} role="status">Đang tải bố cục…</div>;
  if (layout.error) return <div className={'template-element-artwork-state ' + className}>{layout.error}</div>;
  if (!layout.data?.strokes.length) return <div className={'template-element-artwork-state ' + className}>Mẫu chưa có thành phần thiết kế.</div>;
  return <svg className={'template-element-artwork ' + className} viewBox="0 0 200 200" role="img" aria-label={'Bố cục ' + name}>{layout.data.strokes.map(stroke => <path key={stroke.id} d={stroke.points.map((point, index) => (index ? 'L' : 'M') + (100 + point.x * 100) + ',' + (100 + point.y * 100)).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width * 200} strokeLinecap="round" strokeLinejoin="round" />)}</svg>;
}
