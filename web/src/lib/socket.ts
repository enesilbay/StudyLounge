import { io, Socket } from 'socket.io-client';
import { api, BACKEND_URL, reportSessionEnded } from './api';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

let socketInstance: Socket | null = null;
let probeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Bağlantı kimlik nedeniyle düştüyse (süresi dolmuş/iptal edilmiş token, askıya alınmış hesap) oturumu bitirir.
 * Neden mesajına güvenmeyiz: `/users/me` ile token'ı sınarız. 401/403 ise çıkış, değilse (ağ, uyku) yeniden bağlanır.
 * Ayarlarda şifre değişince sunucu eski soketi keser; kısa bekleme yeni token'ın gelmesine zaman tanır.
 */
export function probeSession(socket?: Socket) {
  if (probeTimer) return;
  const probedToken = useAuthStore.getState().token;
  probeTimer = setTimeout(async () => {
    probeTimer = null;
    if (!probedToken || useAuthStore.getState().token !== probedToken) return; // çıkış yapıldı ya da yeni token alındı
    try {
      await api.get('/users/me');
      if (socket && socketInstance === socket && !socket.connected) socket.connect();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) reportSessionEnded();
      // 401'i yanıt kesicisi zaten ele alır; ağ hatasında soket kendi yeniden bağlanma döngüsünü sürdürür.
    }
  }, 1500);
}

function attachHandlers(socket: Socket) {
  socket.on('force_logout', (payload?: { reason?: string }) => {
    reportSessionEnded(payload?.reason);
  });
  socket.on('connect_error', () => probeSession(socket));
  socket.on('disconnect', (reason) => {
    // Sunucu bağlantıyı kendisi kestiyse otomatik yeniden bağlanma olmaz; oturum hâlâ geçerli mi bakılır.
    if (reason === 'io server disconnect') probeSession(socket);
  });
}

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      transports: ['websocket'],
      // Her (yeniden) bağlanışta güncel token okunur; dinleyiciler aynı soket nesnesinde kalır.
      auth: (callback) => callback({ token: useAuthStore.getState().token }),
      autoConnect: true,
    });
    attachHandlers(socketInstance);
  }
  return socketInstance;
};

/** Token değiştiğinde (ayarlarda şifre değişimi) açık soketi yeni token'la yeniden bağlar; dinleyiciler korunur. */
export const reconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance.connect();
};

export const disconnectSocket = () => {
  if (probeTimer) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
  if (socketInstance) {
    socketInstance.removeAllListeners('force_logout');
    socketInstance.disconnect();
    socketInstance = null;
  }
};
