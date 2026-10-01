import { Bell, MicOff, MonitorUp, Swords } from 'lucide-react';
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
 * kamera açıksa masa görüntüyle dolar.
 */
export function DeskTile({
  person,
  videoRoom,
  compact = false,
  onNudge,
  onDuel,
}: {
  person: DeskPerson;
  videoRoom: boolean;
  compact?: boolean;
  onNudge?: () => void;
  onDuel?: () => void;
}) {
  const showVideo = hasLiveVideo(person.cameraStream);
  const status = person.isAtDesk ? 'Odakta' : 'Molada';

  return (
    <article
      aria-label={`${person.name}${person.isSelf ? ' (sen)' : ''}: ${status}`}
      className={`group relative overflow-hidden rounded-xl border bg-surface transition-colors ${
        person.isAtDesk ? `sl-lamp-on ${showVideo ? 'ring-2 ring-accent/80' : ''}` : 'border-border'
      } ${videoRoom ? (compact ? 'aspect-video w-52 shrink-0' : 'aspect-[4/3]') : 'min-h-[148px]'}`}
    >
      {showVideo ? (
        <div className="absolute inset-0 bg-black">
          <VideoView stream={person.cameraStream} mirror={person.isSelf} label={`${person.name} kamerası`} />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 pb-6">
            <Avatar name={person.name} image={person.avatarUrl} frame={person.frame ?? undefined} size={compact ? 'sm' : 'lg'} premium={person.isPremium} />
          </div>
        </div>
      )}

      {/* Alt bilgi şeridi */}
      <div
        className={`absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2 ${
          showVideo ? 'bg-gradient-to-t from-black/75 to-transparent text-white' : 'text-textDark'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${person.isAtDesk ? 'bg-accent shadow-[0_0_10px_var(--sl-brass)]' : 'bg-textMuted/60'}`}
        />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {person.name}
          {person.isSelf ? <span className={showVideo ? 'text-white/70' : 'text-textMuted'}> (sen)</span> : null}
        </p>
        {person.sharing ? <MonitorUp className="h-4 w-4 shrink-0 text-accent" aria-label="Ekran paylaşıyor" /> : null}
        {videoRoom && person.inCall && !person.micOn ? <MicOff className="h-4 w-4 shrink-0 opacity-70" aria-label="Mikrofon kapalı" /> : null}
        {!compact ? <span className={`shrink-0 text-xs ${showVideo ? 'text-white/75' : 'text-textMuted'}`}>{status}</span> : null}
      </div>

      {!person.isSelf && (onNudge || onDuel) ? (
        <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
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
