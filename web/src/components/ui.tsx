import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Crown, Info, Loader2, Moon, Sun, X } from 'lucide-react';
import type { FrameId } from '../lib/types';
import { useTheme } from '../lib/theme';
import { characterAvatarFor } from '../lib/avatars';

/* ───────────────────────── Marka ───────────────────────── */

/** Banker lambası işareti. `lit` iken ampul pirinç rengiyle yanar. */
export function LampMark({ lit = true, className = 'h-7 w-7' }: { lit?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {lit ? <ellipse cx="16" cy="17" rx="12" ry="5" fill="var(--sl-lamp)" /> : null}
      <path d="M5 14.5C5 10.4 10 7.5 16 7.5s11 2.9 11 7H5Z" fill={lit ? 'var(--sl-primary)' : 'var(--sl-muted)'} opacity={lit ? 1 : 0.55} />
      <path d="M7 14.5h18l-1.8 2.6H8.8L7 14.5Z" fill={lit ? 'var(--sl-blush)' : 'var(--sl-muted)'} />
      <rect x="15" y="17" width="2" height="7.5" fill="var(--sl-blush-ink)" />
      <rect x="10" y="24" width="12" height="2.4" rx="1.2" fill="var(--sl-blush-ink)" />
    </svg>
  );
}

export function BrandLockup({ compact = false, large = false }: { compact?: boolean; large?: boolean; logoOnly?: boolean }) {
  const text = large ? 'text-4xl' : compact ? 'text-lg' : 'text-xl';
  const mark = large ? 'h-12 w-12' : compact ? 'h-7 w-7' : 'h-8 w-8';
  return (
    <div className="flex items-center gap-2.5">
      <LampMark className={mark} />
      <span className={`font-mb-display font-medium tracking-tight text-mb-ink ${text}`}>StudyLounge</span>
    </div>
  );
}

/* ───────────────────────── Tema ───────────────────────── */

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={`grid h-10 w-10 place-items-center rounded-[12px] text-mb-body transition hover:bg-mb-surface hover:text-mb-ink ${className}`}>
      {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

/* ───────────────────────── Yerleşim ───────────────────────── */

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-sm font-semibold text-mb-body">{eyebrow}</p> : null}
        <h1 className="font-mb-display text-3xl font-light tracking-[-0.04em] text-mb-ink md:text-[2.5rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-base leading-7 text-mb-body">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[16px] border border-mb-line/70 bg-mb-card shadow-mb-card ${className}`}>{children}</section>;
}

type Tone = 'primary' | 'accent' | 'success' | 'danger' | 'info' | 'violet';

const toneSoft: Record<Tone, string> = {
  primary: 'bg-mb-tint text-mb-action-ink',
  accent: 'bg-mb-lamp/25 text-mb-ink',
  success: 'bg-mb-success-soft text-mb-success',
  danger: 'bg-mb-live-soft text-mb-live-ink',
  info: 'bg-mb-info-soft text-mb-info',
  violet: 'bg-mb-tile-4 text-mb-ink',
};

export function IconTile({ icon: Icon, tone = 'primary' }: { icon: LucideIcon; tone?: Tone }) {
  return (
    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${toneSoft[tone]}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

/* ───────────────────────── Avatar ───────────────────────── */

const frameColors: Record<string, string> = {
  none: 'var(--color-mb-line)',
  gold: '#d9a748',
  emerald: '#3a8264',
  ruby: '#c0533f',
  cosmic: '#8b7fd0',
};

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
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  premium?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const sizes = {
    xs: 'h-8 w-8 text-sm',
    sm: 'h-10 w-10 text-base',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-2xl',
    xl: 'h-28 w-28 text-5xl',
  };
  const border = frame === 'none' ? 1.5 : 3;

  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-full bg-mb-surface font-mb-display text-mb-ink ${sizes[size]}`}
      style={{ border: `${border}px solid ${frameColors[frame] ?? frameColors.none}` }}
    >
      {image && !imgError ? (
        <img src={image} alt={name} onError={() => setImgError(true)} className="h-full w-full rounded-full object-cover" />
      ) : (
        // Fotoğraf yoksa addan seçilen 3B karakter (her yerde aynı kişi aynı karakter).
        <img src={characterAvatarFor(name)} alt={name} draggable={false} className="h-full w-full select-none rounded-full object-cover" />
      )}
      {premium ? (
        <span data-premium-rozet className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-mb-card bg-mb-lamp text-mb-solid" title="Premium">
          <Crown className="h-2.5 w-2.5" />
        </span>
      ) : null}
    </div>
  );
}

/* ───────────────────────── Küçük öğeler ───────────────────────── */

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | Tone }) {
  const cls = tone === 'neutral' ? 'bg-mb-surface text-mb-body' : toneSoft[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 text-sm font-semibold ${cls}`}>{children}</span>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'lamp';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-mb-action text-mb-on-action hover:bg-mb-action-2',
  secondary: 'border border-mb-line bg-mb-card text-mb-ink hover:bg-mb-surface',
  ghost: 'text-mb-body hover:bg-mb-surface hover:text-mb-ink',
  danger: 'bg-mb-live-solid text-mb-on-live hover:opacity-90',
  lamp: 'bg-mb-lamp text-mb-solid hover:brightness-110',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; icon?: LucideIcon; loading?: boolean }) {
  const sizes = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-11 px-4 text-base', lg: 'min-h-13 px-6 text-base' };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${sizes[size]} ${buttonVariants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  helper,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  helper?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const id = useId();
  const cls = 'w-full rounded-[12px] border border-mb-field bg-mb-surface px-3.5 text-base text-mb-ink outline-none transition focus:border-mb-action focus:bg-mb-card';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-mb-ink">{label}</label>
      {multiline ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${cls} min-h-24 py-2.5`} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className={`${cls} min-h-11`} />
      )}
      {helper ? <p className="mt-1.5 text-sm text-mb-body">{helper}</p> : null}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  trailing,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={`flex items-center justify-between gap-4 rounded-[12px] border border-mb-line bg-mb-surface px-3.5 py-3 ${disabled ? 'opacity-70' : ''}`}>
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-base font-semibold text-mb-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-mb-body">{description}</span> : null}
      </label>
      {trailing}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-mb-action' : 'bg-mb-band'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-mb-on-action shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function Notice({ tone = 'info', children, onDismiss }: { tone?: 'info' | 'success' | 'danger' | 'accent'; children: ReactNode; onDismiss?: () => void }) {
  const map = {
    info: { cls: 'border-mb-info/30 bg-mb-info-soft', icon: Info, color: 'text-mb-info' },
    success: { cls: 'border-mb-success/30 bg-mb-success-soft', icon: CheckCircle2, color: 'text-mb-success' },
    danger: { cls: 'border-mb-live/30 bg-mb-live-soft', icon: AlertCircle, color: 'text-mb-live-ink' },
    accent: { cls: 'border-mb-lamp/60 bg-mb-lamp/20', icon: Info, color: 'text-mb-ink' },
  }[tone];
  const Icon = map.icon;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-[12px] border px-3.5 py-3 ${map.cls}`}>
      <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${map.color}`} />
      <div className="min-w-0 flex-1 text-[15px] leading-6 text-mb-ink">{children}</div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Kapat" className="-mr-1 grid h-7 w-7 place-items-center rounded-[8px] text-mb-body hover:text-mb-ink">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function StateBlock({
  title,
  description,
  tone = 'neutral',
  loading = false,
  action,
}: {
  title: string;
  description?: string;
  tone?: 'neutral' | 'danger' | 'primary';
  loading?: boolean;
  action?: ReactNode;
}) {
  const toneClass = { neutral: 'text-mb-body', danger: 'text-mb-live-ink', primary: 'text-mb-action' }[tone];
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-mb-line px-6 py-12 text-center">
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-mb-action" /> : <LampMark lit={false} className={`h-9 w-9 ${toneClass}`} />}
      <h2 className="mt-3 text-xl text-mb-ink">{title}</h2>
      {description ? <p className="mt-1 max-w-md text-base text-mb-body">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Açık pencereler (en üstteki sonda). Esc ve Tab yalnızca en üsttekine etki eder. */
const modalStack: symbol[] = [];

function focusablesIn(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden], [inert]'));
}

export function ModalShell({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Pencere body'nin altında ayrı bir kökte çizilir; böylece geri kalan sayfa `inert` yapılabilir.
  useEffect(() => {
    if (!open) return;
    const el = document.createElement('div');
    // Eski bileşenlerin renk token'ları .sl-yeni kapsamında tanımlı; portal onun dışına çıktığı için kapsam burada verilir.
    el.className = 'sl-yeni';
    document.body.appendChild(el);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal kökü yalnızca tarayıcıda, açılışta oluşur
    setHost(el);
    return () => {
      el.remove();
      setHost(null);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !host) return;
    const id = Symbol('modal');
    modalStack.push(id);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Arka planı erişilemez yap (zaten inert olanlara dokunma).
    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (child === host || !(child instanceof HTMLElement) || child.hasAttribute('inert')) continue;
      child.setAttribute('inert', '');
      inerted.push(child);
    }

    // Odak: içerideki autoFocus zaten odak aldıysa dokunma; yoksa ilk öğe, o da yoksa pencere kabı.
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const first = bodyRef.current ? focusablesIn(bodyRef.current)[0] : undefined;
      (first ?? dialog).focus();
    }

    const onKey = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== id) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = focusablesIn(dialog);
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === firstEl || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && (active === lastEl || !dialog.contains(active))) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      const index = modalStack.indexOf(id);
      if (index >= 0) modalStack.splice(index, 1);
      for (const child of inerted) child.removeAttribute('inert');
      if (previous && previous.isConnected) previous.focus();
    };
  }, [open, host]);

  if (!open || !host) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex min-h-full items-center justify-center p-4 py-10" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-lg rounded-[16px] border border-mb-line/70 bg-mb-card p-6 shadow-mb-raised outline-none">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-2xl text-mb-ink">{title}</h2>
              {description ? <p className="mt-1 text-base text-mb-body">{description}</p> : null}
            </div>
            <button onClick={onClose} aria-label="Kapat" className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div ref={bodyRef}>{children}</div>
        </div>
      </div>
    </div>,
    host,
  );
}
