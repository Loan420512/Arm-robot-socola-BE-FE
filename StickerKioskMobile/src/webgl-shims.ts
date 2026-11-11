import { File, Paths } from 'expo-file-system';
import { Image } from 'react-native';

const blobs = new Map<string, Blob>();
let blobSeq = 0;

/** React Native has no browser loading globals. Three's file and image loaders need these. */
function installWebGLShims() {
  const root = globalThis as unknown as Record<string, unknown>;

  if (typeof root.ProgressEvent === 'undefined') {
    root.ProgressEvent = class ProgressEvent {
      readonly type: string;
      readonly lengthComputable: boolean;
      readonly loaded: number;
      readonly total: number;

      constructor(type: string, init: { lengthComputable?: boolean; loaded?: number; total?: number } = {}) {
        this.type = type;
        this.lengthComputable = init.lengthComputable ?? false;
        this.loaded = init.loaded ?? 0;
        this.total = init.total ?? 0;
      }
    };
  }

  if (typeof root.self === 'undefined') root.self = root;

  const urlApi = root.URL as {
    createObjectURL?: (blob: Blob) => string;
    revokeObjectURL?: (url: string) => void;
  };
  const nativeCreate = urlApi.createObjectURL?.bind(urlApi);
  const nativeRevoke = urlApi.revokeObjectURL?.bind(urlApi);
  urlApi.createObjectURL = (blob: Blob) => {
    const url = nativeCreate ? nativeCreate(blob) : `blob:stiker-${++blobSeq}`;
    blobs.set(url, blob);
    return url;
  };
  urlApi.revokeObjectURL = (url: string) => {
    blobs.delete(url);
    nativeRevoke?.(url);
  };

  if (typeof root.document === 'undefined') {
    root.document = {
      createElementNS(_namespace: string, name: string) {
        if (name !== 'img') throw new Error(`Không tạo được phần tử ${name} trên điện thoại.`);
        return new ExpoImage();
      },
    };
  }
}

class ExpoImage {
  width = 1;
  height = 1;
  naturalWidth = 1;
  naturalHeight = 1;
  localUri = '';
  complete = false;
  crossOrigin: string | null = null;
  private srcValue = '';
  private generation = 0;
  private readonly listeners = new Map<string, Set<(event?: unknown) => void>>();

  addEventListener(type: string, listener: (event?: unknown) => void) {
    const group = this.listeners.get(type) ?? new Set();
    group.add(listener);
    this.listeners.set(type, group);
  }

  removeEventListener(type: string, listener: (event?: unknown) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  get src() {
    return this.srcValue;
  }

  set src(value: string) {
    this.srcValue = value;
    const generation = ++this.generation;
    void this.load(value, generation);
  }

  private emit(type: string, event?: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener.call(this, event);
  }

  private async load(value: string, generation: number) {
    try {
      const localUri = await localImageUri(value);
      const size = await imageSize(localUri);
      if (generation !== this.generation) return;
      this.localUri = localUri;
      this.width = size.width;
      this.height = size.height;
      this.naturalWidth = size.width;
      this.naturalHeight = size.height;
      this.complete = true;
      this.emit('load');
    } catch (error) {
      if (generation !== this.generation) return;
      this.emit('error', error);
    }
  }
}

async function localImageUri(value: string): Promise<string> {
  if (value.startsWith('file://')) return value;
  const blob = blobs.get(value);
  if (blob) return writeBlob(blob);
  if (value.startsWith('data:')) return writeDataUrl(value);
  const name = `stiker-${hash(value)}.${extension(value)}`;
  const file = await File.downloadFileAsync(value, new File(Paths.cache, name), { idempotent: true });
  return file.uri;
}

async function writeBlob(blob: Blob): Promise<string> {
  const file = new File(Paths.cache, `stiker-blob-${++blobSeq}.${extension(blob.type)}`);
  file.create({ overwrite: true });
  file.write(new Uint8Array(await blob.arrayBuffer()));
  return file.uri;
}

function writeDataUrl(value: string): string {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(value);
  if (!match) throw new Error('Ảnh data URL không đọc được.');
  const file = new File(Paths.cache, `stiker-data-${++blobSeq}.${extension(match[1] ?? '')}`);
  file.create({ overwrite: true });
  file.write(match[2] ?? '', { encoding: 'base64' });
  return file.uri;
}

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function extension(value: string): string {
  if (value.includes('png')) return 'png';
  if (value.includes('webp')) return 'webp';
  if (value.includes('jpeg') || value.includes('jpg')) return 'jpg';
  const fromPath = /\.([a-z0-9]+)(?:\?|$)/i.exec(value)?.[1]?.toLowerCase();
  return fromPath && fromPath.length <= 4 ? fromPath : 'png';
}

function hash(value: string): string {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result.toString(16);
}

installWebGLShims();
