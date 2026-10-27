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
 * sekme arka plandaysa tarayıcı bildirimi. Odak odası kendi dürtme bildirimlerini gösterir.
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

    socket.on('receive_dm', onReceiveDm);
    socket.on('nudge_received', onNudge);
    const onBadge = (payload: { badge?: string }) => {
      if (!payload.badge) return;
      useInboxStore.getState().pushToast({ title: 'Yeni rozet kazandın', body: payload.badge, to: `/app/u/${userId}` });
      void useAuthStore.getState().refreshUser();
    };
    socket.on('badge_earned', onBadge);

    // Arkadaşlık isteği ve kabulü anında gelir; 60 sn'lik yoklamayı beklemez.
    const onFriendRequest = (payload: { fromUsername?: string }) => {
      void useInboxStore.getState().refresh();
      const name = payload.fromUsername ? '@' + payload.fromUsername : 'Biri';
      useInboxStore.getState().pushToast({ title: 'Yeni arkadaşlık isteği', body: name + ' seni eklemek istiyor.', to: '/app/dm' });
    };
    const onFriendAccepted = (payload: { username?: string }) => {
      void useInboxStore.getState().refresh();
      useInboxStore.getState().bumpFriendsVersion();
      const name = payload.username ? '@' + payload.username : 'Biri';
      useInboxStore.getState().pushToast({ title: 'İstek kabul edildi', body: name + ' artık arkadaşın.', to: '/app/dm' });
    };
    socket.on('friend_request', onFriendRequest);
    socket.on('friend_accepted', onFriendAccepted);
    // Bağlantı koparsa o sırada gelen mesaj ve istekler kaçmış olabilir; yeniden bağlanınca sayaçlar tazelenir.
    const onReconnect = () => void useInboxStore.getState().refresh();
    socket.on('connect', onReconnect);    return () => {
      socket.off('badge_earned', onBadge);
      socket.off('friend_request', onFriendRequest);
      socket.off('friend_accepted', onFriendAccepted);
      socket.off('connect', onReconnect);      socket.off('receive_dm', onReceiveDm);
      socket.off('nudge_received', onNudge);
    };
  }, [userId, inRoom, navigate]);
}
