import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowCounterClockwise, ArrowUUpLeft, Cube, Eye, Pause, PencilSimple, Play, WarningCircle, Image as ImageIcon } from '@phosphor-icons/react';
import { money } from '../format';
import { useQuery } from '../api';
import { PlateScene } from './PlateScene';
import { appendStroke, buildStrokes, readDraft, saveDraft, undoStroke } from './design';
import type { Point2, StudioDraft } from './design';
import { useCatalog } from './catalog';
import { TemplateArtwork } from './TemplateArtwork';
import { StudioHeader } from './StudioHeader';
import { loadTemplateLayout } from './templateLayout';
import type { StudioStroke } from './design';
import './studio.css';

function pathData(points: Point2[]) { return points.map((point, index) => (index ? 'L' : 'M') + (100 + point.x * 100) + ',' + (100 + point.y * 100)).join(' '); }
function positiveId(value: string | null) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; }
function transformPreviewStrokes(strokes: readonly StudioStroke[], rotation: number, size: number) {
  const angle = rotation * Math.PI / 180;
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  return strokes.map(stroke => ({ ...stroke, points: stroke.points.map(point => ({ x: (point.x * cos - point.y * sin) * size, y: (point.x * sin + point.y * cos) * size })) }));
}
export default function StudioPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const catalog = useCatalog();
  const [draft, setDraft] = useState<StudioDraft>(() => { const stored = readDraft(); const templateId = positiveId(params.get('template')); return templateId ? {...stored,templateId,strokes:[]} : stored; });
  const [mode,setMode] = useState<'templates'|'draw'>('templates');
  const [{progress,playing},setPlayback] = useState({progress:1,playing:false});
  const [speed,setSpeed] = useState(1); const [durationSeconds,setDurationSeconds] = useState(12); const [view,setView] = useState<'perspective'|'top'>('perspective'); const [showRobot,setShowRobot] = useState(true); const [resetKey,setResetKey] = useState(0);
  const [storageError,setStorageError] = useState(false); const [drawing,setDrawing] = useState<Point2[]>([]); const drawingRef = useRef<Point2[]|null>(null);
  const manualStrokes = useMemo(() => buildStrokes(draft),[draft]);
  const templates = catalog.data?.templates.filter(item => item.isActive === true) ?? [];
  const template = templates.find(item => item.id === draft.templateId);
  const plates = catalog.data?.plates.filter(plate => (!template || (typeof template.plateTypeId === 'number' && template.plateTypeId > 0 && plate.typeId === template.plateTypeId)) && catalog.data?.colors.some(color => color.id === plate.colorId && color.isActive === true)) ?? [];
  const plate = plates.find(item => item.id === draft.plateId);
  const color = catalog.data?.colors.find(item => item.id === plate?.colorId);
  const plateColor = color?.colorCode && /^#[a-f0-9]{6}$/i.test(color.colorCode) ? color.colorCode : undefined;
  const currentTemplateId = !catalog.loading && !catalog.error && draft.strokes.length === 0 ? template?.id : undefined;
  const templatePath = useQuery('template-layout:' + (currentTemplateId ?? ''), signal => currentTemplateId ? loadTemplateLayout(currentTemplateId, signal) : Promise.resolve({elements:[],strokes:[]}));
  const { data: layout, loading: isPathLoading, error: pathError } = templatePath;
  const pathStrokes = layout?.strokes;
  const { rotation: previewRotation, size: previewSize } = draft;
  // Parsed query data is read-only here. Keep geometry stable across playback frames.
  /* oxlint-disable react/preserve-manual-memoization */
  const templateStrokes = useMemo(() => {
    if (!currentTemplateId || isPathLoading || pathError || !pathStrokes) return [];
    return transformPreviewStrokes(pathStrokes, previewRotation, previewSize);
  }, [currentTemplateId, pathStrokes, isPathLoading, pathError, previewRotation, previewSize]);
  /* oxlint-enable react/preserve-manual-memoization */
  const strokes = draft.strokes.length ? manualStrokes : templateStrokes;
  const pathLoading = Boolean(currentTemplateId && templatePath.loading);
  const canCheckout = Boolean(!catalog.loading && !catalog.error && template && typeof template.plateTypeId === 'number' && template.plateTypeId > 0 && plate && typeof plate.price === 'number' && typeof plate.stockQuantity === 'number' && plate.stockQuantity > 0);
  useEffect(()=>{document.title='Mẫu chocolate từ xưởng | ChocoRobot Studio';},[]);
  useEffect(()=>{
    if(!playing)return;let frame=0;let last=0;
    const tick=(time:number)=>{if(last&&!document.hidden){const increment=Math.min(time-last,80)/(durationSeconds*1000)*speed;setPlayback(previous=>{const next=Math.min(1,previous.progress+increment);return {progress:next,playing:next<1&&previous.playing};});}last=time;frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,speed,durationSeconds]);
  function commit(next:StudioDraft){setStorageError(!saveDraft(next));setDraft(next);setPlayback({progress:1,playing:false});}
  function update(change:Partial<StudioDraft>){commit({...draft,...change});}
  function selectTemplate(id:number){const next=templates.find(item=>item.id===id);if(!next)return;const selectedPlate=catalog.data?.plates.find(item=>item.id===draft.plateId);update({templateId:id,plateId:typeof next.plateTypeId==='number'&&next.plateTypeId>0&&selectedPlate?.typeId===next.plateTypeId?draft.plateId:null,strokes:[]});}
  function pointFromEvent(event:PointerEvent<SVGSVGElement>):Point2|null{const box=event.currentTarget.getBoundingClientRect();const x=(event.clientX-box.left)/box.width*2-1;const y=(event.clientY-box.top)/box.height*2-1;if(Math.hypot(x,y)>.82*draft.size)return null;const a=-draft.rotation*Math.PI/180;return{x:(x*Math.cos(a)-y*Math.sin(a))/draft.size,y:(x*Math.sin(a)+y*Math.cos(a))/draft.size};}
  function beginDrawing(event:PointerEvent<SVGSVGElement>){if(event.button!==0||event.isPrimary===false)return;const p=pointFromEvent(event);if(!p)return;event.currentTarget.setPointerCapture(event.pointerId);drawingRef.current=[p];setDrawing([p]);}
  function continueDrawing(event:PointerEvent<SVGSVGElement>){const points=drawingRef.current;if(!points||points.length>=500)return;const p=pointFromEvent(event);if(!p)return;const last=points[points.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)<.012)return;drawingRef.current=[...points,p];setDrawing(drawingRef.current);}
  function finishDrawing(){const points=drawingRef.current;drawingRef.current=null;setDrawing([]);if(!points||points.length<2)return;const ink=getComputedStyle(document.documentElement).getPropertyValue('--art-chocolate').trim();commit(appendStroke(draft,points,ink));}
  function simulate(){setPlayback(current=>({progress:current.progress>=1?0:current.progress,playing:!current.playing}));}
  function checkout(){if(!canCheckout)return;if(!saveDraft(draft)){setStorageError(true);return;}navigate('/thanh-toan-mau');}
  return <div className="studio-page"><a className="skip-link" href="#studio-main">Đến khu vực thiết kế</a><StudioHeader/><main className="studio-main" id="studio-main">
    <div className="studio-page-heading"><div><h1>Chọn mẫu chocolate của xưởng</h1><p>Mẫu, dĩa, màu sắc, giá và tồn kho được tải từ hệ thống.</p></div><span className="studio-access"><Eye size={18} aria-hidden="true"/>Customer không cần tài khoản</span></div>
    <div className="studio-workbench"><section className="studio-controls" aria-label="Mẫu và dĩa từ API">
      <div className="studio-control-tabs" role="group" aria-label="Cách tạo mẫu"><button type="button" aria-pressed={mode==='templates'} onClick={()=>setMode('templates')}><Cube size={18}/>Thư viện</button><button type="button" aria-pressed={mode==='draw'} onClick={()=>setMode('draw')}><PencilSimple size={18}/>Tự vẽ</button></div>
      {mode==='templates'?<div className="studio-api-library" aria-busy={catalog.loading}>
        {catalog.loading?<div className="studio-request-loading" role="status"><span className="spinner"/>Đang tải thư viện…</div>:catalog.error?<div className="studio-catalog-error" role="alert"><WarningCircle size={24}/><h2>Chưa tải được thư viện</h2><p>{catalog.error}</p><button type="button" className="button button-secondary" onClick={catalog.reload}>Thử lại</button></div>:templates.length===0?<div className="studio-catalog-empty"><ImageIcon size={26}/><h2>Chưa có mẫu chocolate</h2><p>Thư viện sẽ hiển thị khi xưởng thêm mẫu đang sử dụng.</p><button className="button button-secondary" onClick={catalog.reload}>Tải lại thư viện</button></div>:<div className="studio-api-templates">{templates.map(item=><button className="studio-api-template" type="button" key={item.id} aria-label={item.templateName||'Mẫu #'+item.id} aria-pressed={draft.templateId===item.id} onClick={()=>selectTemplate(item.id)}><TemplateArtwork templateId={item.id} name={item.templateName||'Mẫu #'+item.id}/><span>{item.templateName||'Mẫu #'+item.id}</span></button>)}</div>}
      </div>:<div className="studio-drawing"><p>Nét bạn tự vẽ chỉ là bản nháp trên thiết bị này, chưa phải mẫu của xưởng.</p><svg className="studio-drawing-pad" viewBox="0 0 200 200" role="img" aria-label="Bảng vẽ chocolate trên dĩa" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={()=>{drawingRef.current=null;setDrawing([]);}}><circle className="studio-pad-plate" cx="100" cy="100" r="98"/><circle className="studio-pad-boundary" cx="100" cy="100" r={82*draft.size}/>{strokes.map(stroke=><path key={stroke.id} d={pathData(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width*200} strokeLinecap="round" strokeLinejoin="round"/>)}{drawing.length>1&&<path className="studio-live-stroke" d={pathData(drawing)} transform={'translate(100 100) rotate('+draft.rotation+') scale('+draft.size+') translate(-100 -100)'} fill="none" strokeWidth={draft.lineWidth*200} strokeLinecap="round"/>}</svg><button className="button button-ghost" type="button" disabled={!draft.strokes.length} onClick={()=>commit(undoStroke(draft))}><ArrowUUpLeft size={18}/>Bỏ nét vừa vẽ</button><p className="studio-helper">Tối đa 30 nét. Bản nháp chưa thể gửi đặt hàng.</p></div>}
      <div className="studio-catalog-fields"><label className="field"><span>Dĩa phù hợp</span><select aria-label="Dĩa phù hợp" disabled={catalog.loading||!!catalog.error||!template} value={plate?.id??''} onChange={event=>update({plateId:positiveId(event.target.value)})}><option value="">{template?'Chọn dĩa từ danh mục':'Chọn mẫu trước'}</option>{plates.map(item=><option key={item.id} value={item.id} disabled={!(typeof item.stockQuantity==='number'&&item.stockQuantity>0)}>{item.sku||'Dĩa #'+item.id}{typeof item.price==='number'?' / '+money(item.price):' / Chưa có giá'}</option>)}</select></label>
      {plate&&<dl className="details-grid"><div><dt>Màu dĩa</dt><dd>{color?.colorName||plate.colorName||'Chưa có thông tin'}</dd></div><div><dt>Giá</dt><dd>{money(plate.price)}</dd></div><div><dt>Tồn kho</dt><dd>{plate.stockQuantity??'Chưa có thông tin'}</dd></div><div><dt>Kích thước</dt><dd>{plate.dimensions||'Chưa có thông tin'}</dd></div></dl>}</div>
      <div className="studio-range-fields"><label className="field"><span>Kích thước bố cục <output>{Math.round(draft.size*100)}%</output></span><input aria-label="Kích thước mẫu" type="range" min=".45" max="1" step=".01" value={draft.size} onChange={event=>update({size:Number(event.target.value)})}/></label><label className="field"><span>Góc xoay <output>{draft.rotation}°</output></span><input aria-label="Xoay mẫu" type="range" min="-180" max="180" step="5" value={draft.rotation} onChange={event=>update({rotation:Number(event.target.value)})}/></label>{mode==='draw'&&<label className="field"><span>Độ dày nét</span><input aria-label="Độ dày nét" type="range" min=".006" max=".025" step=".001" value={draft.lineWidth} onChange={event=>update({lineWidth:Number(event.target.value)})}/></label>}</div>
    </section><section className="studio-stage" aria-label="Xem trước dĩa và máy phun 3D"><div className="studio-stage-toolbar"><div><Cube size={19}/><span>Không gian 3D</span></div><div className="studio-view-controls" role="group" aria-label="Góc nhìn"><button type="button" aria-pressed={view==='perspective'} onClick={()=>setView('perspective')}>Góc nghiêng</button><button type="button" aria-pressed={view==='top'} onClick={()=>setView('top')}>Từ trên</button><button className="icon-button" type="button" aria-label="Đặt lại góc nhìn" onClick={()=>setResetKey(current=>current+1)}><ArrowCounterClockwise size={18}/></button></div></div>
      <div className="studio-viewport"><PlateScene strokes={strokes} plateColor={plateColor??''} templateImageUrl={null} templateScale={draft.size} templateRotation={draft.rotation} view={view} progress={progress} showRobot={showRobot} resetKey={resetKey} onDuration={setDurationSeconds}/><p className="studio-camera-hint">Máy phun gốc từ dự án Threejs. Kéo để xoay và cuộn để thu phóng.</p></div>
      {template&&<div className="studio-api-preview-note"><strong>{template.templateName||'Mẫu #'+template.id}</strong><p>Bản xem dựng chữ từ tên thành phần, vị trí X/Y và tỉ lệ trong database. Đây là bố cục minh họa, chưa phải đường chạy đã hiệu chuẩn.</p>{pathLoading && <p role="status">Đang tải bố cục mẫu…</p>}{currentTemplateId && templatePath.error && <div className="notice notice-error" role="alert"><span>{templatePath.error}</span><button type="button" className="button button-secondary" onClick={templatePath.reload}>Tải lại bố cục</button></div>}{!pathLoading && !pathError && layout?.elements.length===0 && <p>Mẫu chưa có thành phần thiết kế.</p>}{!pathLoading && !pathError && !!layout?.elements.length && <ul className="studio-layout-elements">{layout.elements.map(element=><li key={element.id}><span>{element.elementName}</span><small>X: {element.positionX}, Y: {element.positionY}, tỉ lệ: {element.scale}</small></li>)}</ul>}</div>}
      <div className="studio-playback"><button className="button button-secondary" type="button" disabled={!strokes.length || pathLoading} onClick={simulate}>{playing?<Pause size={18}/>:<Play size={18}/>}{playing?'Tạm dừng':progress>0&&progress<1?'Tiếp tục':draft.strokes.length?'Mô phỏng nét tự vẽ':'Xem mô phỏng'}</button><label className="studio-progress"><span className="sr-only">Tiến độ mô phỏng</span><input type="range" min="0" max="1" step=".001" value={progress} disabled={!strokes.length} onChange={event=>setPlayback({playing:false,progress:Number(event.target.value)})}/><output>{strokes.length?Math.round(progress*100)+'%':'Chưa có nét'}</output></label><label className="studio-speed"><span className="sr-only">Tốc độ mô phỏng</span><select aria-label="Tốc độ mô phỏng" value={speed} onChange={event=>setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={.5}>0,5×</option></select></label></div><div className="studio-stage-note"><span>Mô phỏng, không vận hành robot thật.</span><label><input type="checkbox" checked={showRobot} onChange={event=>setShowRobot(event.target.checked)}/>Hiện máy 3D</label></div>
    </section></div><section className="studio-submit-bar" aria-label="Tiếp tục với mẫu"><div><strong>{template?.templateName||'Chưa chọn mẫu của xưởng'}</strong><p>{canCheckout?'Dĩa và giá được xác nhận từ dữ liệu vừa tải.':'Chọn mẫu và dĩa còn hàng từ thư viện trước khi tiếp tục.'}</p></div><button className="button button-primary" type="button" disabled={!canCheckout} onClick={checkout}>Tiếp tục thanh toán<ArrowRight size={19}/></button></section>{storageError&&<div className="notice notice-error" role="alert"><WarningCircle size={20}/>Trình duyệt đang chặn lưu lựa chọn. Cho phép dữ liệu trang web để tiếp tục.</div>}
  </main><footer className="studio-footer"><span>ChocoRobot Studio</span><span>Thiết kế thực tế được xác nhận cùng xưởng.</span></footer></div>;
}
