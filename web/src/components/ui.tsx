import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AlertCircle, Crown, Loader2 } from 'lucide-react';
import logo from '../assets/images/logo.png';
import type { FrameId } from '../lib/types';

const frameColors: Record<FrameId, string> = {
  none: '#DDE3EE',
  gold: '#FFC107',
  emerald: '#2E7D32',
  ruby: '#D32F2F',
  cosmic: '#7C3AED',
};

export function BrandLockup({ compact = false, large = false }: { compact?: boolean; large?: boolean; logoOnly?: boolean }) {
  // We use h-auto and a specific max-height or height to let the width scale naturally since the logo contains text.
  const imageSize = compact ? 'h-10' : large ? 'h-24 md:h-32' : 'h-16 md:h-20';

  return (
    <div className="flex items-center">
      <img src={logo} alt="StudyLounge" className={`${imageSize} w-auto object-contain`} />
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-primary">{eyebrow}</p> : null}
        <h1 className="text-3xl font-black leading-tight text-textDark md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-textMuted md:text-base">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </header>
  );
}

export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.045)] ${className}`}>{children}</section>;
}

export function IconTile({ icon: Icon, tone = 'primary' }: { icon: LucideIcon; tone?: 'primary' | 'accent' | 'success' | 'danger' | 'info' | 'violet' }) {
  const tones = {
    primary: 'bg-softIndigo text-primary',
    accent: 'bg-accent/10 text-accentDark',
    success: 'bg-softSuccess text-success',
    danger: 'bg-softDanger text-danger',
    info: 'bg-softInfo text-info',
    violet: 'bg-violet/10 text-violet',
  };
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function Avatar({
  name,
  image,
  frame = 'none',
  size = 'md',
  premium = false,
}: {
  name: string;
  image?: string | null;
  frame?: FrameId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  premium?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const sizes = {
    sm: 'h-11 w-11 text-base',
    md: 'h-14 w-14 text-lg',
    lg: 'h-[4.5rem] w-[4.5rem] text-2xl',
    xl: 'h-32 w-32 text-5xl',
  };
  const border = frame === 'none' ? 2 : 4;
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-visible rounded-full bg-softIndigo font-black text-primary shadow-sm ${sizes[size]}`}
      style={{ border: `${border}px solid ${frameColors[frame] ?? frameColors.none}` }}
    >
      {image && !imgError ? (
        <img 
          src={image} 
          alt={name} 
          onError={() => setImgError(true)}
          className="h-full w-full rounded-full object-cover" 
        />
      ) : (
        initial
      )}
      {premium ? (
        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-accent/15 text-accentDark">
          <Crown className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'danger' | 'violet' }) {
  const tones = {
    neutral: 'border-border/80 bg-white/65 text-textMuted',
    primary: 'border-primary/15 bg-softIndigo text-primary',
    accent: 'border-accent/20 bg-accent/10 text-accentDark',
    success: 'border-success/20 bg-softSuccess text-success',
    danger: 'border-danger/20 bg-softDanger text-danger',
    violet: 'border-violet/20 bg-violet/10 text-violet',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-black ${tones[tone]}`}>{children}</span>;
}

export function StateBlock({
  title,
  description,
  tone = 'neutral',
  loading = false,
}: {
  title: string;
  description?: string;
  tone?: 'neutral' | 'danger' | 'primary';
  loading?: boolean;
}) {
  const toneClass = {
    neutral: 'text-textMuted',
    danger: 'text-danger',
    primary: 'text-primary',
  }[tone];

  return (
    <Surface className="flex flex-col items-center justify-center p-6 text-center">
      {loading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <AlertCircle className={`h-7 w-7 ${toneClass}`} />}
      <h2 className="mt-3 text-base font-black text-textDark">{title}</h2>
      {description ? <p className="mt-1 max-w-xl text-sm font-semibold text-textMuted">{description}</p> : null}
    </Surface>
  );
}

export function ModalShell({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-primary/30 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 py-10">
        <div className="w-full max-w-lg rounded-xl border border-border bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-textDark">{title}</h2>
            {description ? <p className="mt-1 text-sm font-semibold text-textMuted">{description}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-black text-textMuted">
            Kapat
          </button>
        </div>
        {children}
        </div>
      </div>
    </div>
  );
}
