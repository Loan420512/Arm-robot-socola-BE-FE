import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { money, useCatalog, activeTemplates, type CatalogData } from '../src/catalog';
import { useSelection } from '../src/selection';
import { appendStroke, buildStrokes, readDraft, saveDraft, undoStroke, type Point2, type StudioDraft, type StudioStroke } from '../src/studio/design';
import { PlatePreview } from '../src/plate-preview';
import { DrawingPad } from '../src/studio/drawing-pad';
import { strokesFromGcodeText } from '../src/studio/gcode';
import { loadTemplateLayout } from '../src/studio/templateLayout';
import { StudioViewport } from '../src/studio/viewport';
import { colors, styles } from '../src/theme';

type Mode = 'templates' | 'draw';

function transformPreviewStrokes(strokes: readonly StudioStroke[], rotation: number, size: number): StudioStroke[] {
  const angle = rotation * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({ x: (point.x * cos - point.y * sin) * size, y: (point.x * sin + point.y * cos) * size })),
  }));
}

export default function StudioScreen() {
  const router = useRouter();
  const catalog = useCatalog();
  const selection = useSelection();
  const [draft, setDraft] = useState<StudioDraft>(readDraft);
  useEffect(() => {
    if (draft.templateId) return;
    const chosen = selection.templateId ?? (catalog.status === 'ready' ? activeTemplates(catalog.catalog)[0]?.id : undefined);
    if (!chosen) return;
    setDraft((current) => current.templateId ? current : { ...current, templateId: chosen, strokes: [] });
  }, [catalog, draft.templateId, selection.templateId]);
  const [mode, setMode] = useState<Mode>('templates');
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(12);
  const [view, setView] = useState<'perspective' | 'top'>('perspective');
  const [showRobot, setShowRobot] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [drawing, setDrawing] = useState<Point2[]>([]);
  const drawingRef = useRef<Point2[] | null>(null);
  const [layout, setLayout] = useState<{ elements: { id: number; elementName: string | null; positionX: number | null; positionY: number | null; scale: number | null }[]; strokes: StudioStroke[] }>({ elements: [], strokes: [] });
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState('');
  const [sceneError, setSceneError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const data = catalog.status === 'ready' ? catalog.catalog : null;
  const templates = data?.templates.filter((item) => item.isActive === true) ?? [];
  const template = templates.find((item) => item.id === draft.templateId);
  const plates = platesForStudio(data, template?.plateTypeId ?? null);
  const plate = plates.find((item) => item.id === draft.plateId);
  const color = data?.colors.find((item) => item.id === plate?.colorId);
  const plateColor = color?.colorCode && /^#[a-f0-9]{6}$/i.test(color.colorCode) ? color.colorCode : '';
  const manualStrokes = useMemo(() => buildStrokes(draft), [draft]);
  const currentTemplateId = catalog.status === 'ready' && draft.strokes.length === 0 ? template?.id : undefined;
  const templateStrokes = useMemo(() => {
    if (!currentTemplateId || pathLoading || pathError) return [];
    return transformPreviewStrokes(layout.strokes, draft.rotation, draft.size);
  }, [currentTemplateId, draft.rotation, draft.size, layout.strokes, pathError, pathLoading]);
  const strokes = draft.strokes.length ? manualStrokes : templateStrokes;
  const canCheckout = Boolean(catalog.status === 'ready' && template && typeof template.plateTypeId === 'number' && template.plateTypeId > 0 && plate && typeof plate.price === 'number' && typeof plate.stockQuantity === 'number' && plate.stockQuantity > 0);
  useEffect(() => {
    if (!template || draft.plateId) return;
    const available = plates.find((item) => typeof item.stockQuantity === 'number' && item.stockQuantity > 0 && typeof item.price === 'number');
    if (!available) return;
    setDraft((current) => current.plateId ? current : { ...current, plateId: available.id });
    selection.applySelection(template.id, available.id);
  }, [draft.plateId, plates, selection, template]);

  useEffect(() => {
    if (!currentTemplateId) return;
    const controller = new AbortController();
    setPathLoading(true);
    setPathError('');
    void loadTemplateLayout(currentTemplateId, controller.signal).then(
      async (next) => {
        if (controller.signal.aborted) return;
        let strokes = next.strokes;
        const previewFile = templates.find((item) => item.id === currentTemplateId)?.gcodeFileUrl;
        if (strokes.length === 0 && previewFile) {
          try {
            const response = await fetch(previewFile, { signal: controller.signal });
            if (response.ok) strokes = strokesFromGcodeText(await response.text());
          } catch {
            strokes = [];
          }
        }
        if (controller.signal.aborted) return;
        setLayout({ ...next, strokes });
        setPathLoading(false);
        if (strokes.length > 0) {
          setProgress(1);
          setPlaying(false);
        }
      },
      (error: unknown) => { if (!controller.signal.aborted) { setPathError(error instanceof Error ? error.message : 'Chưa tải được bố cục mẫu.'); setPathLoading(false); } },
    );
    return () => controller.abort();
  }, [currentTemplateId, reloadKey]);

  useEffect(() => {
    if (!playing) return;
    let last = 0;
    let frame = 0;
    const tick = (time: number) => {
      if (last) {
        const increment = Math.min(time - last, 80) / (durationSeconds * 1000) * speed;
        setProgress((value) => {
          const next = Math.min(1, value + increment);
          if (next >= 1) setPlaying(false);
          return next;
        });
      }
      last = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationSeconds, playing, speed]);

  function commit(next: StudioDraft) {
    setStorageError(!saveDraft(next));
    setDraft(next);
    selection.applySelection(next.templateId, next.plateId);
    setProgress(1);
    setPlaying(false);
  }

  function update(change: Partial<StudioDraft>) {
    commit({ ...draft, ...change });
  }

  function selectTemplate(id: number) {
    const next = templates.find((item) => item.id === id);
    if (!next || !data) return;
    const selected = data.plates.find((item) => item.id === draft.plateId);
    update({
      templateId: id,
      plateId: typeof next.plateTypeId === 'number' && next.plateTypeId > 0 && selected?.typeId === next.plateTypeId ? draft.plateId : null,
      strokes: [],
    });
  }

  const paint = useRef(0);
  const screen = useWindowDimensions();
  const padSide = Math.round(Math.min(screen.width - 32, screen.height * 0.42));

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={styles.chipRow}>
          <Pressable accessibilityRole="button" style={[styles.ghost, styles.flexChip, mode === 'templates' ? styles.cardOn : null]} onPress={() => setMode('templates')}><Text style={styles.ghostText}>Thư viện</Text></Pressable>
          <Pressable accessibilityRole="button" style={[styles.ghost, styles.flexChip, mode === 'draw' ? styles.cardOn : null]} onPress={() => setMode('draw')}><Text style={styles.ghostText}>Tự vẽ</Text></Pressable>
        </View>
        {mode === 'templates' ? <Text style={styles.meta}>Kéo để xoay dĩa. Chụm hai ngón để phóng to hoặc thu nhỏ.</Text> : null}
      </View>
      {mode === 'draw' ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.meta}>Đặt ngón tay trong vòng tròn và kéo. Nét hiện ngay dưới tay.</Text>
          <View style={{ width: padSide, height: padSide, alignSelf: 'center' }}>
            <DrawingPad
                strokes={strokes}
                live={drawing}
                size={draft.size}
                rotation={draft.rotation}
                lineWidth={draft.lineWidth}
                onStart={(point) => { drawingRef.current = [point]; setDrawing([point]); }}
                onMove={(point) => {
                  const points = drawingRef.current;
                  if (!points || points.length >= 500) return;
                  const last = points[points.length - 1];
                  if (!last || Math.hypot(point.x - last.x, point.y - last.y) < 0.008) return;
                  drawingRef.current = [...points, point];
                  if (paint.current) return;
                  paint.current = requestAnimationFrame(() => {
                    paint.current = 0;
                    setDrawing(drawingRef.current ?? []);
                  });
                }}
                onEnd={() => {
                  if (paint.current) cancelAnimationFrame(paint.current);
                  paint.current = 0;
                  const points = drawingRef.current;
                  drawingRef.current = null;
                  setDrawing([]);
                  if (!points || points.length < 2) return;
                  commit(appendStroke(draft, points, '#5b2f20'));
                }}
                onInteraction={() => { /* Bảng vẽ nằm ngoài vùng cuộn. */ }}
              />
            </View>
          <Pressable style={[styles.ghost, draft.strokes.length === 0 ? styles.disabled : null]} disabled={draft.strokes.length === 0} onPress={() => commit(undoStroke(draft))}>
            <Text style={styles.ghostText}>Bỏ nét vừa vẽ</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={mode === 'draw' ? { height: 200 } : { flex: 1, minHeight: 280 }}>
        <StudioViewport
          strokes={strokes}
          plateColor={plateColor}
          templateImageUrl={null}
          templateScale={draft.size}
          templateRotation={draft.rotation}
          view={view}
          progress={progress}
          showRobot={showRobot}
          resetKey={resetKey}
          onDuration={setDurationSeconds}
          onError={setSceneError}
          onTemplateError={setSceneError}
          onInteraction={() => { /* Khung 3D nằm ngoài vùng cuộn. */ }}
        />
      </View>
      <ScrollView style={{ flex: 1 }} scrollEnabled={scrollEnabled} contentContainerStyle={styles.pad}>
        {mode === 'templates' ? (
          <>
            <Text style={styles.section}>Mẫu của xưởng</Text>
            {catalog.status === 'loading' ? <Text style={styles.meta}>Đang tải thư viện…</Text> : null}
            {catalog.status === 'error' ? (
              <>
                <Text style={styles.error}>{catalog.message}</Text>
                <Pressable style={styles.ghost} onPress={catalog.reload}><Text style={styles.ghostText}>Thử lại</Text></Pressable>
              </>
            ) : null}
            {catalog.status === 'ready' && templates.length === 0 ? <Text style={styles.meta}>Thư viện sẽ hiển thị khi xưởng thêm mẫu đang sử dụng.</Text> : null}
            {templates.map((item) => (
              <Pressable key={item.id} accessibilityLabel={item.templateName || `Mẫu #${item.id}`} style={[styles.card, draft.templateId === item.id ? styles.cardOn : null]} onPress={() => selectTemplate(item.id)}>
                <View style={styles.row}>
                  <PlatePreview template={item} size="thumb" />
                  <Text style={styles.cardTitle}>{item.templateName || `Mẫu #${item.id}`}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : (
          <Text style={styles.meta}>Tối đa 30 nét. Bản nháp nằm trên máy này và chưa gửi được vào đơn hàng.</Text>
        )}
        <Text style={styles.section}>Dĩa phù hợp</Text>
        {!template ? <Text style={styles.meta}>Chọn mẫu trước</Text> : null}
        {plates.map((item) => {
          const available = typeof item.stockQuantity === 'number' && item.stockQuantity > 0;
          return (
            <Pressable key={item.id} disabled={!available} style={[styles.card, draft.plateId === item.id ? styles.cardOn : null, available ? null : styles.disabled]} onPress={() => update({ plateId: item.id })}>
              <Text style={styles.cardTitle}>{item.sku || `Dĩa #${item.id}`}{typeof item.price === 'number' ? ` / ${money(item.price)}` : ' / Chưa có giá'}</Text>
              <Text style={styles.meta}>{available ? `Còn ${item.stockQuantity}` : 'Hết hàng'}</Text>
            </Pressable>
          );
        })}
        {plate ? (
          <View style={styles.card}>
            <Text style={styles.meta}>Màu dĩa: {color?.colorName || plate.colorName || 'Chưa có thông tin'}</Text>
            <Text style={styles.meta}>Giá: {money(plate.price)}</Text>
            <Text style={styles.meta}>Tồn kho: {plate.stockQuantity ?? 'Chưa có thông tin'}</Text>
            <Text style={styles.meta}>Kích thước: {plate.dimensions || 'Chưa có thông tin'}</Text>
          </View>
        ) : null}
        <Range label="Kích thước bố cục" value={draft.size} min={0.45} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(size) => update({ size })} onInteraction={(active) => setScrollEnabled(!active)} />
        <Range label="Góc xoay" value={draft.rotation} min={-180} max={180} step={5} format={(value) => `${value}°`} onChange={(rotation) => update({ rotation })} onInteraction={(active) => setScrollEnabled(!active)} />
        {mode === 'draw' ? <Range label="Độ dày nét" value={draft.lineWidth} min={0.006} max={0.025} step={0.001} format={(value) => value.toFixed(3)} onChange={(lineWidth) => update({ lineWidth })} onInteraction={(active) => setScrollEnabled(!active)} /> : null}
        <Text style={styles.section}>Điều khiển mô phỏng</Text>
        <View style={styles.chipRow}>
          <Pressable style={[styles.ghost, view === 'perspective' ? styles.cardOn : null]} onPress={() => setView('perspective')}><Text style={styles.ghostText}>Góc nghiêng</Text></Pressable>
          <Pressable style={[styles.ghost, view === 'top' ? styles.cardOn : null]} onPress={() => setView('top')}><Text style={styles.ghostText}>Từ trên</Text></Pressable>
          <Pressable style={styles.ghost} onPress={() => setResetKey((value) => value + 1)}><Text style={styles.ghostText}>Đặt lại góc nhìn</Text></Pressable>
        </View>
        {sceneError ? <Text style={styles.error}>{sceneError}</Text> : null}
        {template ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{template.templateName || `Mẫu #${template.id}`}</Text>
            <Text style={styles.meta}>Bản xem dựng chữ từ tên thành phần, vị trí X/Y và tỉ lệ trong database. Đây là bố cục minh họa, chưa phải đường chạy đã hiệu chuẩn.</Text>
            {pathLoading ? <Text style={styles.meta}>Đang tải bố cục mẫu…</Text> : null}
            {pathError ? (
              <>
                <Text style={styles.error}>{pathError}</Text>
                <Pressable style={styles.ghost} onPress={() => setReloadKey((value) => value + 1)}><Text style={styles.ghostText}>Tải lại bố cục</Text></Pressable>
              </>
            ) : null}
            {!pathLoading && !pathError && layout.elements.length === 0 ? <Text style={styles.meta}>Mẫu chưa có thành phần thiết kế.</Text> : null}
            {layout.elements.map((element) => (
              <Text key={element.id} style={styles.meta}>{element.elementName} · X: {element.positionX}, Y: {element.positionY}, tỉ lệ: {element.scale}</Text>
            ))}
          </View>
        ) : null}
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.ghost, strokes.length === 0 || pathLoading ? styles.disabled : null]}
            disabled={strokes.length === 0 || pathLoading}
            onPress={() => {
              setProgress((value) => (value >= 1 ? 0 : value));
              setPlaying((value) => !value);
            }}
          >
            <Text style={styles.ghostText}>{playing ? 'Tạm dừng' : progress > 0 && progress < 1 ? 'Tiếp tục' : draft.strokes.length ? 'Mô phỏng nét tự vẽ' : 'Xem mô phỏng'}</Text>
          </Pressable>
          {([1, 2, 0.5] as const).map((item) => (
            <Pressable key={item} style={[styles.ghost, speed === item ? styles.cardOn : null]} onPress={() => setSpeed(item)}>
              <Text style={styles.ghostText}>{item === 0.5 ? '0,5×' : `${item}×`}</Text>
            </Pressable>
          ))}
        </View>
        <Range label="Tiến độ mô phỏng" value={progress} min={0} max={1} step={0.001} format={(value) => strokes.length ? `${Math.round(value * 100)}%` : 'Chưa có nét'} onChange={(value) => { setPlaying(false); setProgress(value); }} onInteraction={(active) => setScrollEnabled(!active)} />
        <Pressable style={styles.ghost} onPress={() => setShowRobot((value) => !value)}>
          <Text style={styles.ghostText}>{showRobot ? 'Đang hiện máy 3D' : 'Đang ẩn máy 3D'}</Text>
        </Pressable>
        <Text style={styles.meta}>Mô phỏng, không vận hành robot thật.</Text>
        <Text style={styles.cardTitle}>{template?.templateName || 'Chưa chọn mẫu của xưởng'}</Text>
        <Text style={styles.body}>{canCheckout ? 'Dĩa và giá được xác nhận từ dữ liệu vừa tải.' : 'Chọn mẫu và dĩa còn hàng từ thư viện trước khi tiếp tục.'}</Text>
        {storageError ? <Text style={styles.error}>Máy đang chặn lưu lựa chọn.</Text> : null}
        <Pressable style={[styles.button, canCheckout ? null : styles.disabled]} disabled={!canCheckout} onPress={() => { if (canCheckout && saveDraft(draft)) router.push('/checkout'); }}>
          <Text style={styles.buttonText}>Tiếp tục thanh toán</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function platesForStudio(data: CatalogData | null, plateTypeId: number | null) {
  if (!data || typeof plateTypeId !== 'number') return [];
  return data.plates.filter((plate) => plate.typeId === plateTypeId && data.colors.some((color) => color.id === plate.colorId && color.isActive === true));
}

function Range(props: { label: string; value: number; min: number; max: number; step: number; format: (value: number) => string; onChange: (value: number) => void; onInteraction: (active: boolean) => void }) {
  const width = useRef(1);
  const fraction = (props.value - props.min) / (props.max - props.min);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.meta}>{props.label} {props.format(props.value)}</Text>
      <View
        style={{ height: 36, justifyContent: 'center' }}
        onLayout={(event) => { width.current = event.nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          props.onInteraction(true);
          props.onChange(valueAt(event.nativeEvent.locationX, width.current, props));
        }}
        onResponderMove={(event) => props.onChange(valueAt(event.nativeEvent.locationX, width.current, props))}
        onResponderRelease={() => props.onInteraction(false)}
        onResponderTerminate={() => props.onInteraction(false)}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.line }} />
        <View style={{ position: 'absolute', left: `${fraction * 100}%`, width: 22, height: 22, marginLeft: -11, borderRadius: 11, backgroundColor: colors.cocoa }} />
      </View>
    </View>
  );
}

function valueAt(x: number, width: number, props: { min: number; max: number; step: number }) {
  const ratio = Math.min(1, Math.max(0, x / Math.max(width, 1)));
  const raw = props.min + ratio * (props.max - props.min);
  const stepped = Math.round(raw / props.step) * props.step;
  return Math.min(props.max, Math.max(props.min, Number(stepped.toFixed(4))));
}
