import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../../lib/socket';
import { notifyInBackground } from '../../lib/browserNotify';
import { useAuthStore } from '../../store/authStore';
import { useInboxStore } from '../../store/inboxStore';

const REFRESH_INTERVAL_MS = 60_000;

interface IncomingDm {
  senderId?: number;
  senderName?: string;
  text?: string;
  type?: string;
}

/**
 * Uygulama genelindeki bildirimler: okunmamış DM ve arkadaşlık isteği sayıları,
 * hangi sayfada olunursa olunsun gelen DM ve dürtmeler için kısa bildirim (toast),
 * sekme arka plandaysa tarayıcı bildirimi. Odak odası kendi dürtme/düello bildirimlerini gösterir.
 */
export function useAppNotifications() {
  const userId = useAuthStore((state) => state.user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const inRoom = location.pathname.startsWith('/app/focus/');

  // Sayılar: açılışta, dakikada bir ve sekmeye dönünce tazelenir.
  useEffect(() => {
    if (!userId) return;
    const { refresh } = useInboxStore.getState();
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();

    const onReceiveDm = (message: IncomingDm) => {
      const senderId = message.senderId;
      if (!senderId || senderId === userId) return;
      const { viewingDmWith, addUnread, pushToast } = useInboxStore.getState();
      if (viewingDmWith === senderId && !document.hidden) return;

      addUnread(senderId);
      const name = message.senderName ?? 'Bir arkadaşın';
      const preview = message.type && message.type !== 'text' ? 'Bir dosya gönderdi.' : message.text ?? '';
      pushToast({ title: `${name} mesaj gönderdi`, body: preview, to: '/app/dm' });
      notifyInBackground(`${name} mesaj gönderdi`, preview, () => navigate('/app/dm'));
    };

    const onNudge = (payload: { senderName?: string; message?: string }) => {
      if (inRoom) return;
      const body = payload.message ?? `${payload.senderName ?? 'Bir arkadaşın'} seni çalışmaya çağırıyor.`;
      useInboxStore.getState().pushToast({ title: 'Çalışma daveti', body, to: '/app/lobbies' });
      notifyInBackground('Çalışma daveti', body, () => navigate('/app/lobbies'));
    };

    // Odadayken düello daveti odanın kendi kutusunda görünür; burada yalnızca arka plan bildirimi verilir.
    const onDuel = (payload: { challengerName?: string; betAmount?: number }) => {
      notifyInBackground('Düello daveti', `${payload.challengerName ?? 'Biri'} seni ${payload.betAmount ?? ''} puanlık düelloya çağırıyor.`);
    };

    socket.on('receive_dm', onReceiveDm);
    socket.on('nudge_received', onNudge);
    socket.on('duel_received', onDuel);
    return () => {
      socket.off('receive_dm', onReceiveDm);
      socket.off('nudge_received', onNudge);
      socket.off('duel_received', onDuel);
    };
  }, [userId, inRoom, navigate]);
}
