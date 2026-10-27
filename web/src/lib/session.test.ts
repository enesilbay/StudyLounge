import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const disconnectSocket = vi.fn();
vi.mock('./socket', () => ({ disconnectSocket, getSocket: vi.fn(), reconnectSocket: vi.fn() }));

const { api, handleResponseError, reportSessionEnded, setSessionEndHandler } = await import('./api');
const { consumeLogoutReason, endSession, getLogoutRedirect, installSessionHandlers, isExplicitLogout, safeReturnPath, clearLogoutState } = await import('./session');
const { useAuthStore } = await import('../store/authStore');
const { useInboxStore } = await import('../store/inboxStore');
const { useStudyStore } = await import('../store/studyStore');

function unauthorized(sentToken?: string) {
  const headers = new AxiosHeaders();
  if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`);
  const config = { headers } as InternalAxiosRequestConfig;
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config });
}

function signIn(token = 'tok-1') {
  localStorage.setItem('access_token', token);
  useAuthStore.setState({ token, isAuthenticated: true, user: { id: 1, fullName: 'Ada', email: 'ada@example.com' } });
}

describe('ortak çıkış akışı', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    disconnectSocket.mockClear();
    clearLogoutState();
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
    installSessionHandlers();
  });

  it('oturumu, soketi ve oturuma bağlı store\'ları temizler', () => {
    signIn();
    useInboxStore.setState({ unreadFrom: [3], friendRequests: [] });
    useStudyStore.setState({ subjects: [{ id: 1, name: 'Mat' }] as never, subjectsLoaded: true });

    endSession({ explicit: true });

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(useInboxStore.getState().unreadFrom).toEqual([]);
    expect(useStudyStore.getState().subjectsLoaded).toBe(false);
    expect(isExplicitLogout()).toBe(true);
    expect(consumeLogoutReason()).toBeNull();
  });

  it('sunucu kaynaklı çıkışta gerekçeyi bir kez gösterilmek üzere saklar', () => {
    signIn();
    endSession({ reason: 'Hesabın askıya alındı.' });
    expect(consumeLogoutReason()).toBe('Hesabın askıya alındı.');
    expect(consumeLogoutReason()).toBeNull();
    expect(isExplicitLogout()).toBe(false);
  });

  it('zaten çıkılmışsa ikinci çağrı yan etki yapmaz', () => {
    signIn();
    endSession({ explicit: true });
    endSession({ reason: 'ikinci' });
    expect(disconnectSocket).toHaveBeenCalledTimes(1);
    expect(consumeLogoutReason()).toBeNull();
  });

  it('çıkış sonrası özel adresi hatırlar', () => {
    signIn();
    endSession({ explicit: true, redirectTo: '/auth?dogrula=ada%40example.com' });
    expect(getLogoutRedirect()).toBe('/auth?dogrula=ada%40example.com');
    clearLogoutState();
    expect(getLogoutRedirect()).toBeNull();
  });
});

describe('401 kesicisi', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearLogoutState();
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
  });

  it('oturumdaki token ile gönderilen isteğin 401\'inde oturumu bitirir ve hatayı iletir', async () => {
    const handler = vi.fn();
    setSessionEndHandler(handler);
    signIn('aktif');
    await expect(handleResponseError(unauthorized('aktif'))).rejects.toBeInstanceOf(AxiosError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('token\'sız isteği (yanlış şifreyle giriş) yok sayar', async () => {
    const handler = vi.fn();
    setSessionEndHandler(handler);
    signIn('aktif');
    await expect(handleResponseError(unauthorized())).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it('eski token ile gidip gecikmeli dönen 401, yeni oturumu kapatmaz', async () => {
    const handler = vi.fn();
    setSessionEndHandler(handler);
    signIn('yeni');
    await expect(handleResponseError(unauthorized('eski'))).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it('api örneğine kayıtlıdır ve reportSessionEnded kayıtlı işleyiciyi çağırır', () => {
    const handler = vi.fn();
    setSessionEndHandler(handler);
    reportSessionEnded('neden');
    expect(handler).toHaveBeenCalledWith('neden');
    expect(api.interceptors.response).toBeDefined();
  });
});

describe('authStore oturum yenileme', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearLogoutState();
    installSessionHandlers();
  });

  it('ağ hatasında oturumu korur, 401\'de kapatır', async () => {
    signIn('aktif');
    const get = vi.spyOn(api, 'get');

    get.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
    await useAuthStore.getState().refreshUser();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    get.mockRejectedValueOnce(unauthorized('aktif'));
    await useAuthStore.getState().refreshUser();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    get.mockRestore();
  });

  it('açılışta sunucu 5xx verirse kayıtlı oturumla devam eder', async () => {
    signIn('aktif');
    useAuthStore.setState({ isInitializing: true });
    const response = { status: 503, statusText: 'Service Unavailable', data: {}, headers: {}, config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig };
    vi.spyOn(api, 'get').mockRejectedValueOnce(new AxiosError('Bad', 'ERR_BAD_RESPONSE', undefined, undefined, response));
    await useAuthStore.getState().initAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isInitializing).toBe(false);
  });
});

describe('giriş sonrası dönüş adresi', () => {
  it('yalnızca uygulama içi adreslere izin verir', () => {
    expect(safeReturnPath('/app/premium?odeme=basarili')).toBe('/app/premium?odeme=basarili');
    expect(safeReturnPath('/admin/users')).toBe('/admin/users');
    expect(safeReturnPath('/app')).toBe('/app');
    expect(safeReturnPath('https://kotu.example')).toBe('/app/lobbies');
    expect(safeReturnPath('//kotu.example')).toBe('/app/lobbies');
    expect(safeReturnPath('/application')).toBe('/app/lobbies');
    expect(safeReturnPath(undefined)).toBe('/app/lobbies');
  });
});
