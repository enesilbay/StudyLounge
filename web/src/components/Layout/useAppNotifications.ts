import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../../lib/socket';
import { notifyInBackground } from '../../lib/browserNotify';
import { useAuthStore } from '../../store/authStore';
import { useInboxStore } from '../../store/inboxStore';
import { useStudyStore } from '../../store/studyStore';
import type { ScheduledSession } from '../../lib/study';

const REFRESH_INTERVAL_MS = 60_000;
/** Planlı oturum başlamadan bu kadar önce hatırlatılır (backend'deki mobil hatırlatmayla aynı). */
const PLAN_REMINDER_LEAD_MS = 10 * 60_000;

function isMine(plan: ScheduledSession, userId: number) {
  return plan.owner.id === userId || plan.invites.some((invite) => invite.user.id === userId && invite.status === 'accepted');
}

function planLink(plan: ScheduledSession) {
  return plan.lobby ? `/app/focus/${plan.lobby.id}` : '/app/lobbies';
}

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

    // Odak süresi yazılınca hedef halkası güncellenir; hedef tutulduysa kutlanır.
    const onScore = (payload: { userId?: number }) => {
      if (payload.userId === userId) useStudyStore.getState().refreshGoals().catch(() => undefined);
    };
    const onGoalReached = (payload: { bonus?: number }) => {
      useInboxStore.getState().pushToast({ title: 'Günlük hedefini tuttun!', body: `+${payload.bonus ?? 0} Odak Puanı hesabına eklendi.`, to: '/app/analytics' });
      void useAuthStore.getState().refreshUser();
      useStudyStore.getState().refreshGoals().catch(() => undefined);
    };

    socket.on('receive_dm', onReceiveDm);
    socket.on('nudge_received', onNudge);
    socket.on('duel_received', onDuel);
    socket.on('score_updated', onScore);
    socket.on('goal_reached', onGoalReached);
    const onBadge = (payload: { badge?: string }) => {
      if (!payload.badge) return;
      useInboxStore.getState().pushToast({ title: 'Yeni rozet kazandın', body: payload.badge, to: `/app/u/${userId}` });
      void useAuthStore.getState().refreshUser();
    };
    socket.on('badge_earned', onBadge);
    return () => {
      socket.off('badge_earned', onBadge);
      socket.off('receive_dm', onReceiveDm);
      socket.off('nudge_received', onNudge);
      socket.off('duel_received', onDuel);
      socket.off('score_updated', onScore);
      socket.off('goal_reached', onGoalReached);
    };
  }, [userId, inRoom, navigate]);

  usePlanNotifications(userId, navigate);
}

/** Yeni plan davetleri ve yaklaşan oturumlar için bildirim (liste yukarıdaki dakikalık tazelemeyle gelir). */
function usePlanNotifications(userId: number | undefined, navigate: ReturnType<typeof useNavigate>) {
  const plans = useInboxStore((state) => state.plans);
  const plansLoaded = useInboxStore((state) => state.plansLoaded);
  const knownInvites = useRef<Set<number> | null>(null);

  // Yeni davet: ilk yüklemede var olanlar için bildirim gösterilmez.
  useEffect(() => {
    if (!userId || !plansLoaded) return;
    const pending = plans.filter((plan) => plan.invites.some((invite) => invite.user.id === userId && invite.status === 'pending'));
    if (knownInvites.current) {
      for (const plan of pending) {
        if (knownInvites.current.has(plan.id)) continue;
        const body = `${plan.owner.fullName} seni "${plan.title}" oturumuna çağırıyor.`;
        useInboxStore.getState().pushToast({ title: 'Yeni çalışma daveti', body, to: '/app/lobbies' });
        notifyInBackground('Yeni çalışma daveti', body, () => navigate('/app/lobbies'));
      }
    }
    knownInvites.current = new Set(pending.map((plan) => plan.id));
  }, [plans, plansLoaded, userId, navigate]);

  // Yaklaşan oturum: her plan için bir kez hatırlatılır (sekme yenilense de).
  useEffect(() => {
    if (!userId) return;
    const check = () => {
      const now = Date.now();
      for (const plan of useInboxStore.getState().plans) {
        const startsIn = new Date(plan.startsAt).getTime() - now;
        if (!isMine(plan, userId) || startsIn > PLAN_REMINDER_LEAD_MS || startsIn < -60_000) continue;
        const key = `sl-plan-reminded-${plan.id}`;
        try {
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, '1');
        } catch {
          // Depolama kapalıysa hatırlatma bu sekmede tekrar edebilir; sorun değil.
        }
        const minutes = Math.max(0, Math.round(startsIn / 60_000));
        const body = minutes ? `"${plan.title}" ${minutes} dakika sonra başlıyor.` : `"${plan.title}" başlıyor.`;
        useInboxStore.getState().pushToast({ title: 'Oturum yaklaşıyor', body, to: planLink(plan) });
        notifyInBackground('Oturum yaklaşıyor', body, () => navigate(planLink(plan)));
      }
    };
    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [userId, plans, navigate]);
}
