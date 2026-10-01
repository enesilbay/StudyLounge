import { useEffect, useRef } from 'react';

/** MediaStream'i bir <video> öğesine bağlar. */
export function VideoView({
  stream,
  muted = true,
  mirror = false,
  fit = 'cover',
  className = '',
  label,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  fit?: 'cover' | 'contain';
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      aria-label={label}
      className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${mirror ? '-scale-x-100' : ''} ${className}`}
    />
  );
}

/** Uzak katılımcının sesini çalar. Görüntü öğeleri sessiz tutulur, ses tek yerden gelir. */
export function AudioSink({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  return <audio ref={ref} autoPlay className="hidden" />;
}
