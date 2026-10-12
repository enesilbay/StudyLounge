import { Link } from 'react-router-dom';
import { Bell, Mic, MicOff, MonitorUp, Swords, UserRound, UserX, WifiLow, WifiOff } from 'lucide-react';
import { Avatar } from '../ui';
import { LogoMark } from '../brand/Logo';
import type { FrameId } from '../../lib/types';
import { VideoView } from './MediaViews';
import { hasLiveVideo } from '../../lib/rtc/media';
import type { PeerQuality } from '../../lib/rtc/PeerManager';

export interface DeskPerson {
  userId: number;
  name: string;
  avatarUrl?: string | null;
  frame?: FrameId | null;
  isPremium?: boolean;
  isAtDesk: boolean;
  isSelf: boolean;
  inCall: boolean;
  micOn: boolean;
  sharing: boolean;
  cameraStream: MediaStream | null;
  /** Uzak katılımcıyla görüntülü bağlantının kalitesi (yalnızca aramadayken). */
  quality?: PeerQuality | null;
}

/**
 * Bir katılımcının masası. Odaklanırken masanın üstündeki lamba yanar;
 * kamera açıksa masa görüntüyle dolar. `compact` iken sahnenin altındaki
 * şeritte küçük durur; kamerası açıksa tıklanınca sahneye alınır.
 */
export function DeskTile({
  person,
  videoRoom,
  compact = false,
  scene = false,
  selected = false,
  speaking = false,
  onSelect,
  onNudge,
  onDuel,
  onKick,
}: {
  person: DeskPerson;
  videoRoom: boolean;
  compact?: boolean;
  /** Okuma salonu görünümü: kamera kapalıyken kişi 3B masada oturur. */
  scene?: boolean;
  selected?: boolean;
  /** Şu an konuşuyorsa kart turkuaz halkayla parlar (Discord gibi). */
  speaking?: boolean;
  onSelect?: () => void;
  onNudge?: () => void;
  onDuel?: () => void;
  /** Yalnızca oda sahibine verilir: kişiyi odadan çıkarır. */
  onKick?: () => void;
}) {
  const showVideo = hasLiveVideo(person.cameraStream);
  const status = person.isAtDesk ? 'Odakta' : 'Molada';

  if (scene && !compact && !showVideo) {
    return (
      <article aria-label={`${person.name}${person.isSelf ? ' (sen)' : ''}: ${status}${speaking ? ', konuşuyor' : ''}`} className="group relative mx-auto w-full max-w-[14rem]">
        <div className="relative">
          <img src="/oda/masa-kapali.webp" alt="" aria-hidden="true" draggable={false} width={720} height={667} className="block h-auto w-full select-none drop-shadow-[0_18px_24px_rgb(0_0_0/0.18)]" />
          {/* Odaklanınca lamba yanar: açık masa yumuşakça belirir */}
          <img
            src="/oda/masa-acik.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`absolute inset-0 h-full w-full select-none transition-opacity duration-1000 ${person.isAtDesk ? 'opacity-100' : 'opacity-0'}`}
          />
          {/* Kişi sandalyesinde (avatar sandalyenin arkalığının önünde) */}
          <div className={`absolute left-[63%] top-[-8%] w-[30%] -translate-x-1/2 rounded-full transition ${speaking ? 'ring-[3px] ring-sea ring-offset-2 ring-offset-transparent' : ''}`}>
            <div className="[&>div]:!h-auto [&>div]:!w-full [&>div]:aspect-square">
              <Avatar name={person.name} image={person.avatarUrl} frame={person.frame ?? undefined} size="lg" premium={person.isPremium} />
            </div>
          </div>
        </div>
        {/* Masanın önündeki isim levhası */}
        <p className="relative mx-auto -mt-4 flex w-fit max-w-full items-center gap-1.5 rounded-full border border-mb-line/70 bg-mb-card/95 px-3 py-1 text-[13px] shadow-mb-card">
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${person.isAtDesk ? 'bg-mb-lamp shadow-[0_0_8px_var(--color-mb-lamp)]' : 'bg-mb-body/40'}`} />
          <span className="truncate font-medium text-mb-ink">{person.name}</span>
          {person.isSelf ? <span className="shrink-0 text-mb-body">(sen)</span> : null}
          {person.sharing ? <MonitorUp className="h-3.5 w-3.5 shrink-0 text-mb-action" aria-label="Ekran paylaşıyor" /> : null}
          {videoRoom && person.inCall && !person.micOn ? <MicOff className="h-3.5 w-3.5 shrink-0 text-mb-body" aria-label="Mikrofon kapalı" /> : null}
          <QualityBadge quality={person.quality} onVideo={false} />
        </p>
        {!person.isSelf ? (
          <div className="absolute right-0 top-0 z-[3] flex flex-col gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <Link to={`/app/u/${person.userId}`} title="Profili gör" aria-label={`${person.name} profilini gör`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/95 text-mb-ink shadow-mb-card hover:bg-mb-card">
              <UserRound className="h-4 w-4" />
            </Link>
            {onNudge ? (
              <button type="button" onClick={onNudge} title="Dürt" aria-label={`${person.name} kişisini dürt`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/95 text-mb-action shadow-mb-card hover:bg-mb-card">
                <Bell className="h-4 w-4" />
              </button>
            ) : null}
            {onDuel ? (
              <button type="button" onClick={onDuel} title="Düelloya davet et" aria-label={`${person.name} kişisini düelloya davet et`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/95 text-danger shadow-mb-card hover:bg-mb-card">
                <Swords className="h-4 w-4" />
              </button>
            ) : null}
            {onKick ? (
              <button type="button" onClick={onKick} title="Odadan çıkar" aria-label={`${person.name} kişisini odadan çıkar`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/95 text-mb-body shadow-mb-card hover:bg-mb-card hover:text-danger">
                <UserX className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      aria-label={`${person.name}${person.isSelf ? ' (sen)' : ''}: ${status}${speaking ? ', konuşuyor' : ''}`}
      className={`group relative overflow-hidden rounded-[16px] border bg-surface transition-[color,background-color,box-shadow,border-color] duration-700 ${
        person.isAtDesk ? 'sl-lamp-on' : 'border-border'
      } ${speaking ? 'ring-[3px] ring-sea' : person.isAtDesk && showVideo ? 'ring-2 ring-accent/80' : ''} ${selected ? 'outline-2 outline-offset-2 outline-primary' : ''} ${compact ? 'aspect-video w-36 shrink-0 sm:w-44' : videoRoom ? 'aspect-[4/3]' : 'min-h-[10.5rem]'}`}
    >
      {showVideo ? (
        <div className="absolute inset-0 bg-black">
          <VideoView stream={person.cameraStream} mirror={person.isSelf} label={`${person.name} kamerası`} />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          {/* Masanın lambası: odaklanınca yanar, ışığı masaya düşer (sl-lamp-on). */}
          {!compact ? (
            <LogoMark
              beam={person.isAtDesk}
              className={`absolute left-3 top-3 h-7 w-7 transition-colors duration-700 md:left-1/2 md:-translate-x-1/2 ${person.isAtDesk ? 'text-mb-action' : 'text-textMuted/40'}`}
            />
          ) : null}
          <div className={`flex flex-col items-center gap-2 ${compact ? 'pb-5' : 'pb-4 pt-6'}`}>
            <Avatar name={person.name} image={person.avatarUrl} frame={person.frame ?? undefined} size={compact ? 'sm' : 'lg'} premium={person.isPremium} />
          </div>
        </div>
      )}

      {onSelect && showVideo ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={selected ? `${person.name} kamerasını sahneden indir` : `${person.name} kamerasını büyüt`}
          className="absolute inset-0 z-[1] cursor-zoom-in"
        />
      ) : null}

      {/* Alt bilgi şeridi */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} ${
          showVideo ? 'bg-gradient-to-t from-black/75 to-transparent text-white' : 'text-textDark'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${person.isAtDesk ? 'bg-accent shadow-[0_0_10px_var(--sl-blush)]' : 'bg-textMuted/60'}`}
        />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {person.name}
          {person.isSelf ? <span className={showVideo ? 'text-white/70' : 'text-textMuted'}> (sen)</span> : null}
        </p>
        <QualityBadge quality={person.quality} onVideo={showVideo} />
        {person.sharing ? <MonitorUp className={`h-4 w-4 shrink-0 ${showVideo ? 'text-sea' : 'text-primary'}`} aria-label="Ekran paylaşıyor" /> : null}
        {videoRoom && person.inCall && !person.micOn ? <MicOff className="h-4 w-4 shrink-0 opacity-70" aria-label="Mikrofon kapalı" /> : null}
        {speaking ? <Mic className={`h-4 w-4 shrink-0 ${showVideo ? 'text-sea' : 'text-primary'}`} aria-hidden="true" /> : null}
        {!compact ? <span className={`shrink-0 text-xs ${showVideo ? 'text-white/75' : 'text-textMuted'}`}>{status}</span> : null}
      </div>

      {!person.isSelf && !compact ? (
        <div className="absolute right-2 top-2 z-[3] flex gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Link to={`/app/u/${person.userId}`} title="Profili gör" aria-label={`${person.name} profilini gör`} className="grid h-8 w-8 place-items-center rounded-lg bg-background/85 text-textDark backdrop-blur hover:bg-background">
            <UserRound className="h-4 w-4" />
          </Link>
          {onNudge ? (
            <button type="button" onClick={onNudge} title="Dürt" aria-label={`${person.name} kişisini dürt`} className="grid h-8 w-8 place-items-center rounded-lg bg-background/85 text-accentDark backdrop-blur hover:bg-background">
              <Bell className="h-4 w-4" />
            </button>
          ) : null}
          {onDuel ? (
            <button type="button" onClick={onDuel} title="Düelloya davet et" aria-label={`${person.name} kişisini düelloya davet et`} className="grid h-8 w-8 place-items-center rounded-lg bg-background/85 text-danger backdrop-blur hover:bg-background">
              <Swords className="h-4 w-4" />
            </button>
          ) : null}
          {onKick ? (
            <button type="button" onClick={onKick} title="Odadan çıkar" aria-label={`${person.name} kişisini odadan çıkar`} className="grid h-8 w-8 place-items-center rounded-lg bg-background/85 text-textMuted backdrop-blur hover:bg-background hover:text-danger">
              <UserX className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Bağlantı iyiyse görünmez; orta/zayıfta simge ve açıklama gösterir. */
function QualityBadge({ quality, onVideo }: { quality?: PeerQuality | null; onVideo: boolean }) {
  if (!quality || quality.level === 'good') return null;
  const poor = quality.level === 'poor';
  const parts = [poor ? 'Zayıf bağlantı' : 'Bağlantı dalgalı'];
  if (quality.rttMs != null) parts.push(`gecikme ${quality.rttMs} ms`);
  if (quality.lossPct > 0) parts.push(`kayıp %${quality.lossPct}`);
  if (quality.relayed) parts.push('TURN sunucusu üzerinden');
  const label = parts.join(', ');
  const Icon = poor ? WifiOff : WifiLow;
  return <Icon className={`h-4 w-4 shrink-0 ${poor ? 'text-danger' : onVideo ? 'text-white/80' : 'text-textMuted'}`} aria-label={label}><title>{label}</title></Icon>;
}
