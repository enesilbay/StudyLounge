import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { AtSign, Award, Camera, Coins, Crown, Flame, Info, Mail, Play, Settings, Timer, UserRound, type LucideIcon } from 'lucide-react';
import { useBadgeCatalog } from '../lib/badges';
import { ModalShell, Notice } from '../components/ui';
import { AppPage, Card, IconHeading, Rise, outlineButton } from '../components/app/Kit';
import type { Tile } from '../components/app/Kit';
import { AvatarPicker } from '../components/profile/AvatarPicker';
import { BadgeGrid, HeroChip, ProfileHero, RankLadder, StatGrid } from '../components/profile/ProfileParts';
import { WeekMini } from '../components/profile/WeekMini';
import { RANKS, rankIndexFor } from '../lib/ranks';
import { formatMinutes } from '../lib/study';
import { useAuthStore } from '../store/authStore';

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
  const rank = RANKS[rankIndexFor(score)];
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
            { label: 'Toplam odak', value: score, format: (value) => formatMinutes(Math.round(value)), icon: Timer, tile: 'bg-mb-tile-1', note: `${rank.title} rütbesi` },
            { label: 'Günlük seri', value: user.currentStreak ?? 0, suffix: 'gün', icon: Flame, tile: 'bg-mb-tile-6', note: `En uzun ${user.bestStreak ?? 0} gün` },
            { label: 'Bakiye', value: user.coins ?? 0, suffix: 'puan', icon: Coins, tile: 'bg-mb-tile-5', note: <Link to="/app/shop" className="underline-offset-2 hover:underline">Mağazada harca</Link> },
            { label: 'Rozet', value: badges.length, icon: Award, tile: 'bg-mb-tile-4', note: `Toplam ${Math.max(catalog.length, badges.length)} rozet` },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Rise delay={0.2}>
            <Card className="h-full p-5 md:p-6">
              <RankLadder minutes={score} />
            </Card>
          </Rise>
          <Rise delay={0.26}>
            <Card className="h-full p-5 md:p-6">
              <WeekMini />
            </Card>
          </Rise>
        </div>

        <Rise delay={0.3}>
          <Card className="p-5 md:p-6">
            <IconHeading icon={Award} tile="bg-mb-tile-3" title="Rozetler" text={`${badges.length} / ${Math.max(catalog.length, badges.length)} kazanıldı`} />
            <div className="mt-4">
              <BadgeGrid catalog={catalog} earned={badges} />
            </div>
          </Card>
        </Rise>

        <Rise delay={0.34}>
          <Card className="p-5 md:p-6">
            <IconHeading icon={UserRound} tile="bg-mb-tile-8" title="Hesap" />
            <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <InfoRow icon={AtSign} label="Kullanıcı adı" value={`@${user.username ?? 'ogrenci'}`} />
              <InfoRow icon={Mail} label="E-posta" value={user.email ?? '-'} />
            </dl>
          </Card>
        </Rise>
      </div>

      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSaved={setStatus} />

      <ModalShell open={infoOpen} title="Puan nasıl kazanılır?" description="Odak puanın çalışma odalarında masada kaldığın süreye göre artar." onClose={() => setInfoOpen(false)}>
        <ol className="space-y-3">
          <InfoCard step={1} icon={Play} tile="bg-mb-tile-2" title="Sayacı başlat" text="Bir çalışma odasına gir ve Odaklan'a bas; lamban yanar." />
          <InfoCard step={2} icon={Flame} tile="bg-mb-tile-6" title="Odakta kal" text="Masada kaldığın her dakika puanına eklenir." />
          <InfoCard step={3} icon={Crown} tile="bg-mb-tile-5" title="Elite odalarda 2 kat" text="Elite odalarda aynı süre iki kat puan olarak hesabına işlenir." />
        </ol>
      </ModalShell>
    </AppPage>
  );
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

function InfoCard({ step, icon: Icon, tile, title, text }: { step: number; icon: LucideIcon; tile: Tile; title: string; text: string }) {
  return (
    <m.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + step * 0.08 }}
      className={`flex items-start gap-3 rounded-[16px] p-4 ${tile}`}
    >
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-mb-card/85 text-mb-ink shadow-mb-card">
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-mb-ink text-[11px] font-semibold text-mb-bg">{step}</span>
      </span>
      <div className="min-w-0">
        <p className="font-mb-display text-base font-medium tracking-[-0.01em] text-mb-ink">{title}</p>
        <p className="mt-0.5 text-sm text-mb-ink/70">{text}</p>
      </div>
    </m.li>
  );
}
