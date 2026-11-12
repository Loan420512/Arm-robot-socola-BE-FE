import { useEffect, useRef, useState } from 'react';
import { createStudioScene, type SceneOptions, type StudioScene } from './scene';

export type PlateSceneProps = SceneOptions & {
  onReady?: () => void;
  onError?: (message: string) => void;
  onDuration?: (seconds: number) => void;
};

/** Public visual preview; this component never sends commands to a physical robot. */
export function PlateScene(props: PlateSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const studio = useRef<StudioScene | null>(null);
  const latest = useRef(props);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [robotLoading, setRobotLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { latest.current = props; });

  useEffect(() => {
    if (!host.current) return;
    let active = true;
    try {
      studio.current = createStudioScene(host.current, latest.current, {
        ready() { if (active) { setReady(true); latest.current.onReady?.(); } },
        error(message) { if (active) { setError(message); latest.current.onError?.(message); } },
        robotStatus(loading, message = '') { if (active) { setRobotLoading(loading); setWarning(message); } },
        templateError(message) { if (active) setTemplateError(message); },
        duration(seconds) { if (active && seconds > 0) latest.current.onDuration?.(seconds); },
      });
      studio.current.update(latest.current);
    } catch {
      // A browser without WebGL must keep the remaining studio controls usable.
      queueMicrotask(() => {
        if (!active) return;
        const message = 'Trình duyệt chưa hỗ trợ hiển thị 3D. Hãy bật tăng tốc phần cứng hoặc thử trình duyệt khác.';
        setError(message);
        latest.current.onError?.(message);
      });
    }
    return () => { active = false; studio.current?.dispose(); studio.current = null; };
  }, [retry]);

  useEffect(() => { studio.current?.update(props); }, [props]);

  function reload() {
    setReady(false); setError(''); setWarning(''); setTemplateError(''); setRobotLoading(false); setRetry(value => value + 1);
  }

  return <div className="plate-scene" aria-busy={!ready && !error}>
    <div className="plate-scene-canvas" ref={host} />
    {!ready && !error && <div className="scene-loading" role="status"><span className="spinner" aria-hidden="true" /><span>Đang mở mô hình dĩa…</span></div>}
    {ready && robotLoading && props.showRobot && <div className="scene-robot-loading" role="status">Đang tải máy phun 3D…</div>}
    {error && <div className="scene-error" role="alert"><p>{error}</p><button className="button button-secondary" type="button" onClick={reload}>Mở lại bản xem trước</button></div>}
    {warning && <p className="scene-warning" role="status">{warning}</p>}
    {templateError && <p className="scene-warning" role="alert">{templateError}</p>}
    <details className="scene-credits"><summary>Nguồn máy 3D</summary><p>Máy phun được giữ từ cụm RoboticDispenserToolhead trong dự án Threejs bạn cung cấp, gồm đầu kim, ống chứa, piston, mô-tơ và ống dẫn. <a href="https://sketchfab.com/3d-models/dish-ffbc1f59a2e94267a286d460f948632c" target="_blank" rel="noreferrer">Mô hình dĩa</a> của bogdanzloy20280, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</p></details>
  </div>;
}
