import type { Message } from './types';

/** DM metni en fazla bu kadar karakter olabilir (sunucuyla aynı sınır). */
export const DM_MAX_LENGTH = 2000;
const ACK_TIMEOUT_MS = 8000;

export type DmSendResult = { ok: true; message?: Message } | { ok: false; error: string };

/** `send_dm` için gereken en küçük soket arayüzü (testte sahtesi kullanılır). */
export interface DmSocketLike {
  connected: boolean;
  timeout(ms: number): {
    emit(event: string, payload: unknown, ack: (error: Error | null, response?: { ok: boolean; message?: Message; error?: string }) => void): void;
  };
}

/** Mesajı ack ile gönderir; bağlantı yoksa, zaman aşımında ya da sunucu reddederse `ok: false` döner. */
export function sendDm(socket: DmSocketLike, targetUserId: number, text: string): Promise<DmSendResult> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve({ ok: false, error: 'Boş mesaj gönderilemez.' });
  if (trimmed.length > DM_MAX_LENGTH) return Promise.resolve({ ok: false, error: `Mesaj en fazla ${DM_MAX_LENGTH} karakter olabilir.` });
  if (!socket.connected) return Promise.resolve({ ok: false, error: 'Bağlantı yok. İnternetini kontrol edip tekrar dene.' });

  return new Promise((resolve) => {
    socket.timeout(ACK_TIMEOUT_MS).emit('send_dm', { targetUserId, text: trimmed }, (error, response) => {
      if (error) {
        resolve({ ok: false, error: 'Mesaj gönderilemedi, sunucudan yanıt gelmedi. Tekrar dene.' });
      } else if (!response?.ok) {
        resolve({ ok: false, error: response?.error || 'Mesaj gönderilemedi.' });
      } else {
        resolve({ ok: true, message: response.message });
      }
    });
  });
}
