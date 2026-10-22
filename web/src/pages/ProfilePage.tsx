import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { Award, BarChart3, Camera, Coins, Crown, Flame, Info, Mail, Settings, ShoppingBag, Timer, UserRound } from 'lucide-react';
import { useBadgeCatalog } from '../lib/badges';
import { ModalShell, Notice } from '../components/ui';
import { AppPage, Card, CardTitle, Rise, outlineButton } from '../components/app/Kit';
import { AvatarPicker } from '../components/profile/AvatarPicker';
import { BadgeGrid, HeroChip, ProfileHero, StatGrid } from '../components/profile/ProfileParts';
import { useAuthStore } from '../store/authStore';

const ranks = [
  { title: 'Çaylak', min: 0, max: 50 },
  { title: 'Odaklı', min: 50, max: 200 },
  { title: 'Akademisyen', min: 200, max: 500 },
  { title: 'Usta', min: 500, max: 1000 },
  { title: 'Efsane', min: 1000, max: null },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore();
  const { badges: catalog, load: loadCatalog } = useBadgeCatalog();
  const [infoOpen, setInfoOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void refreshUser();
    loadCatalog().catch(() => undefined);
  }, [refreshUser, loadCatalog]);

  if (!user) return <p className="py-16 text-center text-mb-body">Profil yükleniyor…</p>;

  const score = user.totalFocusMinutes ?? 0;
  const rankIndex = getRankIndex(score);
  const rank = ranks[rankIndex];
  const progress = getRankProgress(score);
  const badges = (user.badges ?? []).filter((badge) => badge.trim().length > 0);

  return (
    <AppPage
      title="Profil"
      actions={
        <>
          <button type="button" onClick={() => setInfoOpen(true)} className={outlineButton}>
            <Info className="h-4 w-4" />
            Puan nasıl kazanılır?
          </button>
          <Link to="/app/settings" className={outlineButton}>
            <Settings className="h-4 w-4" />
            Ayarlar
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {status ? <Notice tone="success" onDismiss={() => setStatus(null)}>{status}</Notice> : null}

        <ProfileHero
          name={user.fullName}
          username={user.username}
          avatarUrl={user.avatarUrl}
          frame={user.equippedProfileFrame}
          premium={user.isPremium}
          cover={user.equippedProfileCover}
          avatarSlot={
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Profil fotoğrafını değiştir"
              title="Profil fotoğrafını değiştir"
              className="absolute bottom-1 left-1 grid h-10 w-10 place-items-center rounded-full border-4 border-mb-solid bg-mb-action text-mb-on-action transition hover:bg-mb-action-2"
            >
              <Camera className="h-4 w-4" />
            </button>
          }
          chips={
            <>
              <HeroChip>
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                {rank.title}
              </HeroChip>
              {user.isPremium ? (
                <HeroChip>
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  Premium
                </HeroChip>
              ) : null}
            </>
          }
        />

        <StatGrid
          items={[
            { label: 'Odak dakikası', value: score, icon: Timer },
            { label: 'Günlük seri', value: user.currentStreak ?? 0, suffix: 'gün', icon: Flame },
            { label: 'Bakiye', value: user.coins ?? 0, suffix: 'puan', icon: Coins },
            { label: 'Rozet', value: badges.length, icon: Award },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Rütbe merdiveni */}
          <Rise delay={0.2}>
            <Card className="h-full p-5 md:p-6">
              <CardTitle aside={progress.nextRank ? `${progress.current} / ${progress.total} dk` : 'Tamamlandı'}>
                {progress.nextRank ? `Sıradaki rütbe: ${progress.nextRank}` : 'En yüksek rütbedesin'}
              </CardTitle>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-mb-surface">
                <m.div
                  className="h-full rounded-full bg-gradient-to-r from-mb-action to-mb-action-2"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <ol className="mt-5 grid grid-cols-5 gap-1" aria-label="Rütbeler">
                {ranks.map((item, index) => {
                  const reached = index <= rankIndex;
                  return (
                    <li key={item.title} className="flex flex-col items-center gap-2 text-center">
                      <m.span
                        aria-hidden="true"
                        className={`grid h-9 w-9 place-items-center rounded-full text-sm font-medium ${
                          index === rankIndex ? 'bg-mb-action text-mb-on-action shadow-mb-press' : reached ? 'bg-mb-tint text-mb-action' : 'bg-mb-surface text-mb-body'
                        }`}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 + index * 0.07 }}
                      >
                        {index + 1}
                      </m.span>
                      <span className={`text-[12px] leading-tight sm:text-[13px] ${index === rankIndex ? 'font-medium text-mb-ink' : 'text-mb-body'}`}>
                        {item.title}
                        <span className="sr-only">{index === rankIndex ? ' (şu anki rütben)' : reached ? ' (geçildi)' : ''}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </Rise>

          {/* Kısayollar ve hesap */}
          <Rise delay={0.28}>
            <Card className="h-full p-5 md:p-6">
              <CardTitle>Hesap</CardTitle>
              <dl className="mt-4 space-y-3">
                <InfoRow icon={UserRound} label="Kullanıcı adı" value={`@${user.username ?? 'ogrenci'}`} />
                <InfoRow icon={Mail} label="E-posta" value={user.email ?? '-'} />
              </dl>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link to="/app/shop" className={outlineButton}>
                  <ShoppingBag className="h-4 w-4" />
                  Mağaza
                </Link>
                <Link to="/app/analytics" className={outlineButton}>
                  <BarChart3 className="h-4 w-4" />
                  Analitik
                </Link>
              </div>
            </Card>
          </Rise>
        </div>

        <Rise delay={0.3}>
          <Card className="p-5 md:p-6">
            <CardTitle aside={`${badges.length} / ${Math.max(catalog.length, badges.length)}`}>Rozetler</CardTitle>
            <div className="mt-4">
              <BadgeGrid catalog={catalog} earned={badges} />
            </div>
          </Card>
        </Rise>
      </div>

      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSaved={setStatus} />

      <ModalShell open={infoOpen} title="Puan nasıl kazanılır?" description="Odak puanın çalışma odalarında masada kaldığın süreye göre artar." onClose={() => setInfoOpen(false)}>
        <div className="space-y-3">
          <InfoCard title="Sayacı başlat" text="Bir çalışma odasına gir ve Odaklan'a bas; lamban yanar." />
          <InfoCard title="Odakta kal" text="Masada kaldığın her dakika puanına eklenir." />
          <InfoCard title="Elite odalarda 2 kat" text="Elite odalarda aynı süre iki kat puan olarak hesabına işlenir." />
        </div>
      </ModalShell>
    </AppPage>
  );
}

function getRankIndex(points: number) {
  const index = ranks.findIndex((rank) => rank.max === null || (points >= rank.min && points < rank.max));
  return index < 0 ? 0 : index;
}

function getRankProgress(points: number) {
  const rank = ranks[getRankIndex(points)];
  if (rank.max === null) return { current: points, total: points || 1, percentage: 100, nextRank: null as string | null };
  const current = Math.max(0, points - rank.min);
  const total = rank.max - rank.min;
  const nextRank = ranks[ranks.findIndex((item) => item.title === rank.title) + 1]?.title ?? null;
  return { current, total, percentage: Math.min(100, (current / total) * 100), nextRank };
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-mb-surface px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-mb-action" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-mb-body">{label}</dt>
        <dd className="truncate text-[15px] font-medium text-mb-ink">{value}</dd>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-sunken p-4">
      <p className="text-base font-semibold text-textDark">{title}</p>
      <p className="mt-1 text-sm text-textMuted">{text}</p>
    </div>
  );
}
