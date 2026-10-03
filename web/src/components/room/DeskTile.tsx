import { Bell, Mic, MicOff, MonitorUp, Swords } from 'lucide-react';
import { Avatar } from '../ui';
import type { FrameId } from '../../lib/types';
import { VideoView } from './MediaViews';
import { hasLiveVideo } from '../../lib/rtc/media';

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
  selected = false,
  speaking = false,
  onSelect,
  onNudge,
  onDuel,
}: {
  person: DeskPerson;
  videoRoom: boolean;
  compact?: boolean;
  selected?: boolean;
  /** Şu an konuşuyorsa kart turkuaz halkayla parlar (Discord gibi). */
  speaking?: boolean;
  onSelect?: () => void;
  onNudge?: () => void;
  onDuel?: () => void;
}) {
  const showVideo = hasLiveVideo(person.cameraStream);
  const status = person.isAtDesk ? 'Odakta' : 'Molada';

  return (
    <article
      aria-label={`${person.name}${person.isSelf ? ' (sen)' : ''}: ${status}${speaking ? ', konuşuyor' : ''}`}
      className={`group relative overflow-hidden rounded-xl border bg-surface transition-[color,background-color,box-shadow] ${
        person.isAtDesk ? 'sl-lamp-on' : 'border-border'
      } ${speaking ? 'ring-[3px] ring-sea' : person.isAtDesk && showVideo ? 'ring-2 ring-accent/80' : ''} ${selected ? 'outline-2 outline-offset-2 outline-primary' : ''} ${compact ? 'aspect-video w-36 shrink-0 sm:w-44' : videoRoom ? 'aspect-[4/3]' : 'min-h-[148px]'}`}
    >
      {showVideo ? (
        <div className="absolute inset-0 bg-black">
          <VideoView stream={person.cameraStream} mirror={person.isSelf} label={`${person.name} kamerası`} />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className={`flex flex-col items-center gap-2 ${compact ? 'pb-5' : 'pb-6'}`}>
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
        {person.sharing ? <MonitorUp className={`h-4 w-4 shrink-0 ${showVideo ? 'text-sea' : 'text-primary'}`} aria-label="Ekran paylaşıyor" /> : null}
        {videoRoom && person.inCall && !person.micOn ? <MicOff className="h-4 w-4 shrink-0 opacity-70" aria-label="Mikrofon kapalı" /> : null}
        {speaking ? <Mic className={`h-4 w-4 shrink-0 ${showVideo ? 'text-sea' : 'text-primary'}`} aria-hidden="true" /> : null}
        {!compact ? <span className={`shrink-0 text-xs ${showVideo ? 'text-white/75' : 'text-textMuted'}`}>{status}</span> : null}
      </div>

      {!person.isSelf && (onNudge || onDuel) ? (
        <div className="absolute right-2 top-2 z-[3] flex gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
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
        </div>
      ) : null}
    </article>
  );
}
