type Listener = (event: PointerLike) => void;

export type PointerLike = {
  type: string;
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  deltaY?: number;
  deltaMode?: number;
  ctrlKey?: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
};

/** Enough of a DOM node for Three's OrbitControls on a phone. */
export class PointerSurface {
  style: { touchAction: string } = { touchAction: 'none' };
  clientWidth = 1;
  clientHeight = 1;
  private readonly listeners = new Map<string, Set<Listener>>();

  setAttribute() { /* OrbitControls sets aria on the canvas. */ }
  setPointerCapture() { /* The gesture owns the finger for the drag. */ }
  releasePointerCapture() { /* The gesture owns the finger for the drag. */ }

  addEventListener(type: string, listener: Listener) {
    const group = this.listeners.get(type) ?? new Set();
    group.add(listener);
    this.listeners.set(type, group);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight, x: 0, y: 0 };
  }

  /** OrbitControls listens for keys on the root node of the canvas. */
  getRootNode() {
    installStudioDom();
    return (globalThis as { document: { addEventListener: (type: string, listener: Listener, options?: unknown) => void; removeEventListener: (type: string, listener: Listener, options?: unknown) => void } }).document;
  }

  dispatch(event: PointerLike) {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
  }
}

export function installStudioDom() {
  const root = globalThis as { document?: DocumentLike; window?: unknown; devicePixelRatio?: number; self?: unknown };
  const listeners = new Map<string, Set<(event?: unknown) => void>>();
  const current = root.document ?? { hidden: false, addEventListener() {}, removeEventListener() {} };
  if (!current.addEventListener) {
    current.addEventListener = (type: string, listener: (event?: unknown) => void) => {
      const group = listeners.get(type) ?? new Set();
      group.add(listener);
      listeners.set(type, group);
    };
    current.removeEventListener = (type: string, listener: (event?: unknown) => void) => {
      listeners.get(type)?.delete(listener);
    };
  }
  if (current.hidden === undefined) current.hidden = false;
  root.document = current;
  root.window = root.window ?? root;
  root.self = root.self ?? root;
  root.devicePixelRatio = root.devicePixelRatio || 2;
}

type DocumentLike = {
  hidden: boolean;
  addEventListener: (type: string, listener: (event?: unknown) => void) => void;
  removeEventListener: (type: string, listener: (event?: unknown) => void) => void;
};
