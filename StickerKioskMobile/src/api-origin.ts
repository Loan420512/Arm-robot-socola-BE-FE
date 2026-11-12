import Constants from 'expo-constants';

const API_PORT = 5143;

/** Host Expo Go already used to reach this computer, such as 172.20.10.2:8081. */
function lanOrigin(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return `http://${host}:${API_PORT}`;
}

/**
 * ChocoRobot API (BE-SWD). A phone cannot reach 127.0.0.1 on the computer, so a
 * physical device follows the Metro host. Set EXPO_PUBLIC_API_URL to the Render
 * origin when the API is hosted, with no trailing slash.
 */
export const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL ??
  lanOrigin() ??
  (process.env.EXPO_OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://127.0.0.1:${API_PORT}`);

export function assetUrl(path: string): string | null {
  if (!path.trim()) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_ORIGIN}${path}`;
  return null;
}
