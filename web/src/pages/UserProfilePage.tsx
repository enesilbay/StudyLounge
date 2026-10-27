import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Ban, CalendarDays, Check, DoorOpen, Flag, Flame, MessageCircle, Mountain, Timer, UserMinus, UserPlus, UserX } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiResponses';
import { useBadgeCatalog } from '../lib/badges';
import type { PublicProfile } from '../lib/types';
import { Button, ModalShell, Notice } from '../components/ui';
import { resolveFriendRoomPath } from '../lib/friendRoom';
import { Card, EmptyState, ErrorState, IconHeading, Skeleton, Rise, actionButton, ghostButton, outlineButton } from '../components/app/Kit';
import { BadgeGrid, HeroChip, ProfileHero, RankLadder, StatGrid } from '../components/profile/ProfileParts';
import { formatMinutes } from '../lib/study';
import ReportDialog from '../components/social/ReportDialog';
import { useInboxStore } from '../store/inboxStore';

/** Başka bir kullanıcının herkese açık profili: istatistikler, rozetler, arkadaşlık ve engelleme. */
export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  // 'notfound': profil yok ya da görülemiyor; 'error': ağ/sunucu hatası (tekrar denenebilir).
  const [loadState, setLoadState] = useState<'ok' | 'notfound' | 'error'>('ok');
  const [confirm, setConfirm] = useState<'unfriend' | 'block' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const { badges: catalog, load: loadCatalog } = useBadgeCatalog();

  const load = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      try {
        const response = await api.get<PublicProfile>(`/users/${userId}/public`);
        if (isCancelled()) return;
        setProfile(response.data);
        setLoadState('ok');
      } catch (error) {
        if (isCancelled()) return;
        const status = (error as { response?: { status?: number } }).response?.status;
        // Yalnızca sunucu "yok/yasak" derse bulunamadı; ağ ve sunucu hatası ayrı gösterilir.
        setLoadState(status === 404 || status === 403 ? 'notfound' : 'error');
      }
    },
    [userId],
  );

  // /app/u/3 → /app/u/4 geçişinde eski profil kalmasın.
  useEffect(() => {
    let ignore = false;
    setProfile(null);
    setLoadState('ok');
    setMessage(null);
    setConfirm(null);
    setReportOpen(false);
    void load(() => ignore);
    loadCatalog().catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [load, loadCatalog]);

  if (loadState === 'notfound') {
    return (
      <EmptyState
        icon={UserX}
        title="Bu profil görüntülenemiyor"
        text="Kullanıcı bulunamadı ya da profilini göremezsin."
        action={
          <button type="button" onClick={() => navigate(-1)} className={outlineButton}>
            <ArrowLeft className="h-4 w-4" />
            Geri dön
          </button>
        }
      />
    );
  }
  if (loadState === 'error') {
    return <ErrorState title="Profil yüklenemedi" text="Bağlantını kontrol edip tekrar dene." onRetry={() => { setLoadState('ok'); void load(); }} />;
  }
  if (!profile) return <Skeleton className="mx-auto h-64 max-w-4xl" />;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: success });
      await load();
      void useInboxStore.getState().refresh();
    } catch (error) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (roomName: string) => {
    navigate(await resolveFriendRoomPath(roomName));
  };

  const confirmAction = async () => {
    const kind = confirm;
    setConfirm(null);
    if (kind === 'unfriend') {
      await run(() => api.delete(`/users/friends/${profile.id}`), `${profile.fullName} arkadaşlıktan çıkarıldı.`);
    } else if (kind === 'block') {
      await run(() => api.post(`/moderation/blocks/${profile.id}`), 'Kullanıcı engellendi. Artık sana mesaj ya da istek gönderemez.');
    }
  };

  const { friendship } = profile;
  const isSelf = friendship.status === 'self';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Rise>
        <button type="button" onClick={() => navigate(-1)} className={ghostButton}>
          <ArrowLeft className="h-4 w-4" />
          Geri
        </button>
      </Rise>

      <ProfileHero
        name={profile.fullName}
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        frame={profile.equippedProfileFrame}
        premium={profile.isPremium}
        cover={profile.equippedProfileCover}
        chips={
          <>
            {profile.isOnline ? (
              <HeroChip>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-mb-action-2" />
                Çevrim içi
              </HeroChip>
            ) : null}
            {profile.currentRoom ? (
              <button
                type="button"
                onClick={() => void joinRoom(profile.currentRoom!)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-mb-on-solid/10 px-3 py-1 text-[13px] font-medium text-mb-on-solid transition hover:bg-mb-on-solid/20"
              >
                <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Şu an {profile.currentRoom} odasında
              </button>
            ) : null}
          </>
        }
      >
        {!isSelf ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {profile.blockedByMe ? (
              <button type="button" disabled={busy} onClick={() => void run(() => api.delete(`/moderation/blocks/${profile.id}`), 'Engel kaldırıldı.')} className={heroButton}>
                <Ban className="h-4 w-4" />
                Engeli kaldır
              </button>
            ) : (
              <>
                {friendship.status === 'none' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => api.post('/users/friend-request', { receiverUsername: profile.username }), 'Arkadaşlık isteği gönderildi.')}
                    className={actionButton}
                  >
                    <UserPlus className="h-4 w-4" />
                    Arkadaş ekle
                  </button>
                ) : null}
                {friendship.status === 'outgoing' ? (
                  <button type="button" disabled className={heroButton}>
                    İstek gönderildi
                  </button>
                ) : null}
                {friendship.status === 'incoming' && friendship.requestId ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => useInboxStore.getState().respondToRequest(friendship.requestId!, 'accepted'), 'Artık arkadaşsınız.')}
                    className={actionButton}
                  >
                    <Check className="h-4 w-4" />
                    İsteği kabul et
                  </button>
                ) : null}
                {friendship.status === 'friends' ? (
                  <>
                    <Link to={`/app/dm?with=${profile.id}`} className={actionButton}>
                      <MessageCircle className="h-4 w-4" />
                      Mesaj gönder
                    </Link>
                    <button type="button" disabled={busy} onClick={() => setConfirm('unfriend')} className={heroButton}>
                      <UserMinus className="h-4 w-4" />
                      Arkadaşlıktan çıkar
                    </button>
                  </>
                ) : null}
                <button type="button" disabled={busy} onClick={() => setConfirm('block')} className={heroButton}>
                  <Ban className="h-4 w-4" />
                  Engelle
                </button>
              </>
            )}
            <button type="button" onClick={() => setReportOpen(true)} className={heroButton}>
              <Flag className="h-4 w-4" />
              Şikayet et
            </button>
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-mb-on-solid/75">
            Profilin başkalarına böyle görünüyor.{' '}
            <Link to="/app/profile" className="font-medium text-mb-on-solid underline underline-offset-2">
              Profilini düzenle
            </Link>
          </p>
        )}
      </ProfileHero>

      {message ? <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice> : null}

      <StatGrid
        items={[
          { label: 'Bu hafta', value: profile.weekMinutes, format: (value) => formatMinutes(Math.round(value)), icon: CalendarDays, tile: 'bg-mb-tile-2' },
          { label: 'Toplam odak', value: profile.totalFocusMinutes, format: (value) => formatMinutes(Math.round(value)), icon: Timer, tile: 'bg-mb-tile-1' },
          { label: 'Seri', value: profile.currentStreak ?? 0, suffix: 'gün', icon: Flame, tile: 'bg-mb-tile-6' },
          { label: 'En uzun seri', value: profile.bestStreak ?? 0, suffix: 'gün', icon: Mountain, tile: 'bg-mb-tile-5' },
        ]}
      />

      <Rise delay={0.2}>
        <Card className="p-5 md:p-6">
          <RankLadder minutes={profile.totalFocusMinutes} self={isSelf} />
        </Card>
      </Rise>

      <Rise delay={0.25}>
        <Card className="p-5 md:p-6">
          <IconHeading icon={Award} tile="bg-mb-tile-3" title="Rozetler" text={`${profile.badges.length} / ${Math.max(catalog.length, profile.badges.length)} kazanıldı`} />
          <div className="mt-4">
            <BadgeGrid catalog={catalog} earned={profile.badges} />
          </div>
        </Card>
      </Rise>

      <ModalShell
        open={confirm !== null}
        title={confirm === 'unfriend' ? 'Arkadaşlıktan çıkarılsın mı?' : 'Kullanıcı engellensin mi?'}
        description={
          confirm === 'unfriend'
            ? `${profile.fullName} arkadaş listenden çıkar; sen de onun listesinden çıkarsın. Dilersen sonra yeniden istek gönderebilirsin.`
            : `${profile.fullName} sana mesaj ya da istek gönderemez. Engeli istediğin zaman kaldırabilirsin.`
        }
        onClose={() => setConfirm(null)}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirm(null)}>Vazgeç</Button>
          <Button type="button" variant="danger" onClick={() => void confirmAction()}>
            {confirm === 'unfriend' ? 'Arkadaşlıktan çıkar' : 'Engelle'}
          </Button>
        </div>
      </ModalShell>

      <ReportDialog target={reportOpen ? { id: profile.id, fullName: profile.fullName } : null} onClose={() => setReportOpen(false)} />
    </div>
  );
}

/** Koyu üst bandın içindeki ikincil düğme. */
const heroButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-mb-on-solid/10 px-4 text-[15px] font-medium text-mb-on-solid transition hover:bg-mb-on-solid/20 disabled:opacity-60';
