import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ban, Check, DoorOpen, Flag, MessageCircle, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiResponses';
import { badgeIcon, useBadgeCatalog } from '../lib/badges';
import { formatMinutes } from '../lib/study';
import type { PublicProfile } from '../lib/types';
import { Avatar, Button, Notice, StateBlock, Surface } from '../components/ui';
import ReportDialog from '../components/social/ReportDialog';
import { useInboxStore } from '../store/inboxStore';

/** Başka bir kullanıcının herkese açık profili: istatistikler, rozetler, arkadaşlık ve engelleme. */
export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const { badges: catalog, load: loadCatalog } = useBadgeCatalog();

  const load = useCallback(async () => {
    try {
      const response = await api.get<PublicProfile>(`/users/${userId}/public`);
      setProfile(response.data);
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    loadCatalog().catch(() => undefined);
  }, [load, loadCatalog]);

  if (notFound) {
    return <StateBlock title="Bu profil görüntülenemiyor" description="Kullanıcı bulunamadı ya da profilini göremezsin." action={<Button onClick={() => navigate(-1)}>Geri dön</Button>} />;
  }
  if (!profile) return <StateBlock loading title="Profil yükleniyor" />;

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

  const { friendship } = profile;
  const isSelf = friendship.status === 'self';
  const earned = new Set(profile.badges);
  // Katalogda olmayan eski rozetler de gösterilir.
  const badgeList = [...catalog, ...profile.badges.filter((name) => !catalog.some((badge) => badge.name === name)).map((name) => ({ name, description: '', icon: '' }))];

  return (
    <div className="mx-auto max-w-3xl">
      <Surface className="p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile.fullName} image={profile.avatarUrl} frame={profile.equippedProfileFrame} premium={profile.isPremium} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl leading-tight text-textDark md:text-4xl">
              {profile.fullName} {profile.equippedIcon ?? ''}
            </h1>
            <p className="mt-1 text-base text-textMuted">
              @{profile.username}
              {profile.isOnline ? <span className="ml-2 font-semibold text-success">çevrim içi</span> : null}
            </p>
            {profile.currentRoom ? (
              <Link to="/app/lobbies" className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary hover:underline">
                <DoorOpen className="h-4 w-4" />
                Şu an {profile.currentRoom} odasında
              </Link>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-4">
          <Stat label="Bu hafta" value={formatMinutes(profile.weekMinutes)} />
          <Stat label="Toplam odak" value={formatMinutes(profile.totalFocusMinutes)} />
          <Stat label="Seri" value={`${profile.currentStreak ?? 0} gün`} />
          <Stat label="En uzun seri" value={`${profile.bestStreak ?? 0} gün`} />
        </dl>

        {!isSelf ? (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {profile.blockedByMe ? (
              <Button variant="secondary" icon={Ban} loading={busy} onClick={() => void run(() => api.delete(`/moderation/blocks/${profile.id}`), 'Engel kaldırıldı.')}>
                Engeli kaldır
              </Button>
            ) : (
              <>
                {friendship.status === 'none' ? (
                  <Button icon={UserPlus} loading={busy} onClick={() => void run(() => api.post('/users/friend-request', { receiverUsername: profile.username }), 'Arkadaşlık isteği gönderildi.')}>
                    Arkadaş ekle
                  </Button>
                ) : null}
                {friendship.status === 'outgoing' ? <Button variant="secondary" disabled>İstek gönderildi</Button> : null}
                {friendship.status === 'incoming' && friendship.requestId ? (
                  <Button icon={Check} loading={busy} onClick={() => void run(() => useInboxStore.getState().respondToRequest(friendship.requestId!, 'accepted'), 'Artık arkadaşsınız.')}>
                    İsteği kabul et
                  </Button>
                ) : null}
                {friendship.status === 'friends' ? (
                  <Link to={`/app/dm?with=${profile.id}`}>
                    <Button icon={MessageCircle}>Mesaj gönder</Button>
                  </Link>
                ) : null}
                <Button variant="ghost" icon={Ban} disabled={busy} onClick={() => void run(() => api.post(`/moderation/blocks/${profile.id}`), 'Kullanıcı engellendi. Artık sana mesaj, düello ya da istek gönderemez.')}>
                  Engelle
                </Button>
              </>
            )}
            <Button variant="ghost" icon={Flag} onClick={() => setReportOpen(true)}>
              Şikayet et
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-[15px] text-textMuted">
            Profilin başkalarına böyle görünüyor. Düzenlemek için <Link to="/app/profile" className="font-semibold text-primary hover:underline">Profil</Link> sayfasına git.
          </p>
        )}
        {message ? (
          <div className="mt-4">
            <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>
          </div>
        ) : null}
      </Surface>

      <section className="mt-6" aria-labelledby="badges-title">
        <h2 id="badges-title" className="mb-3 text-xl text-textDark">
          Rozetler <span className="text-base text-textMuted">({profile.badges.length}/{Math.max(badgeList.length, profile.badges.length)})</span>
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badgeList.map((badge) => {
            const has = earned.has(badge.name);
            const Icon = badgeIcon(badge.icon);
            return (
              <li key={badge.name} className={`flex items-start gap-3 rounded-lg border p-3 ${has ? 'border-primary/40 bg-softIndigo' : 'border-dashed border-border opacity-60'}`}>
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${has ? 'text-primary' : 'text-textMuted'}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-textDark">{badge.name}</p>
                  {badge.description ? <p className="text-sm text-textMuted">{badge.description}</p> : null}
                  <span className="sr-only">{has ? 'Kazanıldı' : 'Henüz kazanılmadı'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <ReportDialog target={reportOpen ? { id: profile.id, fullName: profile.fullName } : null} onClose={() => setReportOpen(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-textMuted">{label}</dt>
      <dd className="mt-0.5 font-display text-2xl text-textDark">{value}</dd>
    </div>
  );
}
