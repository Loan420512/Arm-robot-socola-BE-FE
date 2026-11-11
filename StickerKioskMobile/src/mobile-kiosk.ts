import { fetchCatalog } from '../../StickerKiosk/src/api/catalog';
import { createHttp } from '../../StickerKiosk/src/api/http';
import { lookupOrder, submitOrder } from '../../StickerKiosk/src/api/order';
import { parseCheckout, type CheckoutForm, type FormErrors } from '../../StickerKiosk/src/kiosk/checkout';
import { attemptIdOf, type KioskBackend } from '../../StickerKiosk/src/kiosk/port';
import {
  EMPTY_DESIGN,
  initialSession,
  reduce,
  type Design,
  type PendingOrder,
  type Session,
  type SessionEvent,
} from '../../StickerKiosk/src/kiosk/session';
import { API_ORIGIN } from './api-origin';

const memory = new Map<string, string>();

function readDesign(): Design {
  try {
    const raw = memory.get('design');
    if (!raw) return EMPTY_DESIGN;
    const parsed = JSON.parse(raw) as Partial<Design>;
    return {
      modelId: (parsed.modelId ?? null) as Design['modelId'],
      caseId: (parsed.caseId ?? null) as Design['caseId'],
      placements: Array.isArray(parsed.placements) ? parsed.placements : [],
      activeKey: parsed.activeKey ?? null,
    };
  } catch {
    return EMPTY_DESIGN;
  }
}

export interface MobileKiosk {
  getState(): Session;
  subscribe(onChange: () => void): () => void;
  dispatch(event: SessionEvent): void;
  pay(form: CheckoutForm): FormErrors | null;
  reloadCatalog(): void;
  readonly backend: KioskBackend;
}

export function createMobileKiosk(): MobileKiosk {
  const http = createHttp(`${API_ORIGIN}/api`, 30_000);
  const backend: KioskBackend = {
    fetchCatalog: () => fetchCatalog(http),
    submitOrder: (draft, resume, report) => submitOrder(http, draft, resume, report),
    lookupOrder: (code) => lookupOrder(http, code),
  };

  let state = initialSession(readDesign());
  const listeners = new Set<() => void>();
  let resume: PendingOrder | null = null;

  function dispatch(event: SessionEvent) {
    const next = reduce(state, event);
    if (next === state) return;
    const entered = next.now.phase !== state.now.phase || next.epoch !== state.epoch;
    state = next;
    memory.set('design', JSON.stringify(state.design));
    for (const listener of listeners) listener();
    if (entered && state.now.phase === 'paying') {
      const epoch = state.epoch;
      const order = state.now.order;
      void backend.submitOrder(order.draft, order.checkpoint, (report) => {
        if (state.epoch === epoch) dispatch({ type: 'progress', report });
      }).then((result) => {
        if (state.epoch === epoch) dispatch({ type: 'settled', result });
      });
    }
  }

  function reloadCatalog() {
    dispatch({ type: 'catalog', catalog: { status: 'loading' } });
    void backend.fetchCatalog().then((catalog) => {
      dispatch({ type: 'catalog', catalog: catalog === 'unreachable' ? { status: 'unreachable' } : { status: 'ready', catalog } });
      if (resume && state.catalog.status === 'ready') {
        const order = resume;
        resume = null;
        dispatch({ type: 'resume', order });
      }
    });
  }

  reloadCatalog();

  return {
    getState: () => state,
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    dispatch,
    pay(form) {
      const parsed = parseCheckout(form);
      if (!parsed.ok) return parsed.errors;
      const raw = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      dispatch({ type: 'pay', customer: parsed.customer, method: parsed.method, attempt: attemptIdOf(raw) });
      return null;
    },
    reloadCatalog,
    backend,
  };
}
