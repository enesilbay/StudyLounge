import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MicOff, MonitorUp, Swords, UserRound, UserX, WifiLow, WifiOff } from 'lucide-react';
import { Avatar } from '../ui';
import type { FrameId } from '../../lib/types';
import { VideoView } from './MediaViews';
import { hasLiveVideo } from '../../lib/rtc/media';
import type { PeerQuality } from '../../lib/rtc/PeerManager';
import { tileColorFor } from '../../lib/room/tileColors';

export interface RoomPerson {
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

/*
 * Odadaki kişi kutusu (Meet ve Discord'daki gibi). Kamera açıksa görüntü kutuyu doldurur;
 * kapalıysa kişiye özgü renkli zeminde avatar durur. Odaklanan kişinin kutusu lamba
 * ışığıyla çevrelenir; konuşan kişinin kutusu yeşil halkayla parlar.
 * Kutu boyutu dıştan verilir (ızgara ya da yan şerit); kutu kabını doldurur.
 */
export function ParticipantTile({
  person,
  videoRoom,
  small = false,
  selected = false,
  speaking = false,
  onSelect,
  onNudge,
  onDuel,
  onKick,
}: {
  person: RoomPerson;
  videoRoom: boolean;
  /** Sahne açıkken yan şeritteki küçük kutu. */
  small?: boolean;
  selected?: boolean;
  speaking?: boolean;
  onSelect?: () => void;
  onNudge?: () => void;
  onDuel?: () => void;
  /** Yalnızca oda sahibine verilir: kişiyi odadan çıkarır. */
  onKick?: () => void;
}) {
  const showVideo = hasLiveVideo(person.cameraStream);
  const status = person.isAtDesk ? 'Odakta' : 'Molada';
  const ring = speaking
    ? 'ring-[3px] ring-mb-action'
    : person.isAtDesk
      ? 'ring-2 ring-mb-lamp shadow-[0_0_32px_-8px_var(--color-mb-lamp)]'
      : 'ring-1 ring-mb-line/60';
  const plate = showVideo ? 'bg-black/55 text-white' : 'bg-mb-card/85 text-mb-ink';

  return (
    <article
      aria-label={`${person.name}${person.isSelf ? ' (sen)' : ''}: ${status}${speaking ? ', konuşuyor' : ''}`}
      className={`group relative h-full w-full overflow-hidden rounded-[16px] transition-[box-shadow] duration-500 ${showVideo ? 'bg-black' : tileColorFor(person.userId)} ${ring} ${
        selected ? 'outline-2 outline-offset-2 outline-mb-action' : ''
      }`}
    >
      {showVideo ? (
        <div className="absolute inset-0">
          <VideoView stream={person.cameraStream} mirror={person.isSelf} label={`${person.name} kamerası`} />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className={`relative aspect-square ${small ? 'w-[34%] max-w-16' : 'w-[24%] min-w-14 max-w-36'}`}>
            {speaking ? <span aria-hidden="true" className="absolute -inset-1.5 rounded-full border-2 border-mb-action motion-safe:animate-pulse" /> : null}
            <div className="h-full w-full [&>div]:!h-full [&>div]:!w-full">
              <Avatar name={person.name} image={person.avatarUrl} frame={person.frame ?? undefined} size="lg" premium={person.isPremium} />
            </div>
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

      {/* Durum: odakta / molada */}
      {!small ? (
        <span className={`pointer-events-none absolute left-2.5 top-2.5 z-[2] inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 text-xs font-medium ${plate}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${person.isAtDesk ? 'bg-mb-lamp shadow-[0_0_8px_var(--color-mb-lamp)]' : 'bg-current opacity-40'}`} />
          {status}
        </span>
      ) : null}

      {/* İsim levhası */}
      <p
        className={`pointer-events-none absolute bottom-2 left-2 z-[2] flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-[8px] font-medium ${plate} ${small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-[13px]'}`}
      >
        {small ? <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${person.isAtDesk ? 'bg-mb-lamp' : 'bg-current opacity-40'}`} /> : null}
        <span className="truncate">
          {person.name}
          {person.isSelf ? <span className="opacity-70"> (sen)</span> : null}
        </span>
        {person.sharing ? <MonitorUp className="h-3.5 w-3.5 shrink-0" aria-label="Ekran paylaşıyor" /> : null}
        {videoRoom && person.inCall && !person.micOn ? <MicOff className="h-3.5 w-3.5 shrink-0 text-mb-live" aria-label="Mikrofon kapalı" /> : null}
        <QualityBadge quality={person.quality} />
      </p>

      {!person.isSelf && !small ? (
        <div className="absolute right-2 top-2 z-[3] flex gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Link to={`/app/u/${person.userId}`} title="Profili gör" aria-label={`${person.name} profilini gör`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/90 text-mb-ink shadow-mb-card hover:bg-mb-card">
            <UserRound className="h-4 w-4" />
          </Link>
          {onNudge ? (
            <button type="button" onClick={onNudge} title="Dürt" aria-label={`${person.name} kişisini dürt`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/90 text-mb-action shadow-mb-card hover:bg-mb-card">
              <Bell className="h-4 w-4" />
            </button>
          ) : null}
          {onDuel ? (
            <button type="button" onClick={onDuel} title="Düelloya davet et" aria-label={`${person.name} kişisini düelloya davet et`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/90 text-danger shadow-mb-card hover:bg-mb-card">
              <Swords className="h-4 w-4" />
            </button>
          ) : null}
          {onKick ? (
            <button type="button" onClick={onKick} title="Odadan çıkar" aria-label={`${person.name} kişisini odadan çıkar`} className="grid h-8 w-8 place-items-center rounded-[10px] bg-mb-card/90 text-mb-body shadow-mb-card hover:bg-mb-card hover:text-danger">
              <UserX className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * Kişi olmayan kutu: canlı ekran paylaşımı ("Yayını izle"), açık tahta ya da davet.
 * `live` verilirse koyu zeminde kırmızı CANLI rozetiyle durur.
 */
export function SceneTile({
  icon: Icon,
  title,
  text,
  action,
  live = false,
  small = false,
  dashed = false,
}: {
  icon: typeof MonitorUp;
  title: string;
  text?: string;
  action?: ReactNode;
  live?: boolean;
  small?: boolean;
  dashed?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className={`relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[16px] px-3 text-center ${
        live ? 'bg-stage text-white' : dashed ? 'border-2 border-dashed border-mb-line bg-mb-card/40 text-mb-ink' : 'bg-mb-card text-mb-ink ring-1 ring-mb-line'
      }`}
    >
      {live ? (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-[6px] bg-mb-live px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse" />
          CANLI
        </span>
      ) : null}
      <span className={`grid place-items-center rounded-full ${small ? 'h-8 w-8' : 'h-12 w-12'} ${live ? 'bg-white/10' : 'bg-mb-surface'}`}>
        <Icon className={small ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
      </span>
      <p className={`max-w-full truncate font-medium ${small ? 'text-xs' : 'text-[15px]'}`}>{title}</p>
      {text && !small ? <p className={`max-w-xs text-[13px] ${live ? 'text-white/70' : 'text-mb-body'}`}>{text}</p> : null}
      {action ? <div className={small ? '' : 'mt-1'}>{action}</div> : null}
    </section>
  );
}

/** Bağlantı iyiyse görünmez; orta/zayıfta simge ve açıklama gösterir. */
function QualityBadge({ quality }: { quality?: PeerQuality | null }) {
  if (!quality || quality.level === 'good') return null;
  const poor = quality.level === 'poor';
  const parts = [poor ? 'Zayıf bağlantı' : 'Bağlantı dalgalı'];
  if (quality.rttMs != null) parts.push(`gecikme ${quality.rttMs} ms`);
  if (quality.lossPct > 0) parts.push(`kayıp %${quality.lossPct}`);
  if (quality.relayed) parts.push('TURN sunucusu üzerinden');
  const label = parts.join(', ');
  const Icon = poor ? WifiOff : WifiLow;
  return (
    <Icon className={`h-3.5 w-3.5 shrink-0 ${poor ? 'text-mb-live' : ''}`} aria-label={label}>
      <title>{label}</title>
    </Icon>
  );
}
