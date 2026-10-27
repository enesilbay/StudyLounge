import axios from 'axios';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:3000'; // Fallback to localhost for web dev

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL;

export const api = axios.create({
  baseURL: BACKEND_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Oturum geçersiz olduğunda çalışacak ortak çıkış akışı (lib/session.ts kaydeder; döngüsel içe aktarmayı önler). */
type SessionEndHandler = (reason?: string) => void;
let sessionEndHandler: SessionEndHandler | null = null;

export function setSessionEndHandler(handler: SessionEndHandler | null) {
  sessionEndHandler = handler;
}

/** Oturumun artık geçersiz olduğunu bildirir (401, `force_logout`, sunucu kaynaklı kopuş). */
export function reportSessionEnded(reason?: string) {
  sessionEndHandler?.(reason);
}

/**
 * 401 kesicisi: oturumdaki token ile gönderilmiş bir istek 401 alırsa oturum biter.
 * Token'sız istekler (yanlış şifre ile giriş vb.) ve artık geçersiz sayılan eski token'la gidenler yok sayılır;
 * böylece ayarlarda yeni token alındıktan sonra gecikmeli gelen eski 401 yeni oturumu kapatmaz.
 */
export function handleResponseError(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const sent = String(error.config?.headers?.Authorization ?? '').replace(/^Bearer\s+/i, '');
    const current = localStorage.getItem('access_token');
    if (sent && current && sent === current) {
      reportSessionEnded();
    }
  }
  return Promise.reject(error);
}

api.interceptors.response.use((response) => response, handleResponseError);

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
