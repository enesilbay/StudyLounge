const DEFAULT_BACKEND_URL = 'http://127.0.0.1:3000'; // Fallback to localhost for web dev

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL;

export function apiUrl(path: string): string {
  return `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function assetUrl(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return apiUrl(path);
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
