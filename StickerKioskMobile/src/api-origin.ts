import Constants from 'expo-constants';

const API_PORT = 5174;

/** Host Expo Go already used to reach this computer, such as 172.20.10.2:8081. */
function lanOrigin(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return `http://${host}:${API_PORT}`;
}

/**
 * Same StickerRobot API the website uses.
 * A phone cannot reach 127.0.0.1 on the computer, so a physical device follows the Metro host.
 * Android emulator still uses the special host alias. Set EXPO_PUBLIC_API_URL to override.
 */
export const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL ??
  lanOrigin() ??
  (process.env.EXPO_OS === 'android' ? 'http://10.0.2.2:5174' : 'http://127.0.0.1:5174');

export function assetUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}
