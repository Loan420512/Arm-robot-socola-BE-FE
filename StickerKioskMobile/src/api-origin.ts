/** Public ChocoRobot API on Render. No trailing slash. */
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? 'https://chocorobot.onrender.com';

export function assetUrl(path: string): string | null {
  if (!path.trim()) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_ORIGIN}${path}`;
  return null;
}
