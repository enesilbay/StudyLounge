import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion';
import { ArrowLeft, DoorOpen, LayoutDashboard, ScrollText, Search, ShieldAlert, Users, type LucideIcon } from 'lucide-react';
import { Avatar, StateBlock, ThemeToggle } from '../ui';
import { LogoMark } from '../brand/Logo';
import { useAuthStore } from '../../store/authStore';
import { useAdminPending, type AdminPending } from '../../lib/admin';
import { CommandPalette } from './CommandPalette';

interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: (pending: AdminPending) => number;
}

// Menüde yalnızca çalışan bölümler görünür; Ödemeler kendi aşamalarında eklenir.
const NAV_ITEMS: AdminNavItem[] = [
  { path: '/admin', label: 'Genel bakış', icon: LayoutDashboard, end: true },
  { path: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { path: '/admin/rooms', label: 'Odalar', icon: DoorOpen },
  { path: '/admin/moderation', label: 'Moderasyon', icon: ShieldAlert, badge: (p) => p.openReports + p.openFeedback },
  { path: '/admin/actions', label: 'İşlem kaydı', icon: ScrollText },
];

/** Yönetim paneli: uygulamadan ayrı, sol menülü düzen. Yalnızca yöneticiler görür. */
export default function AdminLayout() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const pending = useAdminPending((state) => state.pending);
  const refreshPending = useAdminPending((state) => state.refresh);

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (isAdmin) void refreshPending();
  }, [isAdmin, refreshPending]);

  // Ctrl+K (Mac'te Cmd+K): genel arama.
  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="sl-yeni grid min-h-screen place-items-center bg-mb-surface px-4 text-mb-ink">
        <div className="w-full max-w-lg">
          <StateBlock
            title="Bu sayfa yöneticilere açık"
            description="Hesabının yönetici yetkisi yok."
            action={
              <Link to="/app/lobbies" className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-mb-action px-4 font-medium text-mb-on-action shadow-mb-press hover:bg-mb-action-2">
                <ArrowLeft className="h-4 w-4" />
                Uygulamaya dön
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const displayName = user?.fullName ?? 'Yönetici';

  return (
    // Yönetim paneli de yeni kimliktedir (.sl-yeni): içerikteki eski bileşenler yeni renk ve yazı tiplerini alır.
    <div className="sl-yeni min-h-screen bg-mb-surface text-mb-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-mb-line bg-mb-bg px-4 py-5 lg:flex">
        <Link to="/admin" className="mb-7 flex items-center gap-2.5 px-2" aria-label="Yönetim, genel bakış">
          <LogoMark className="h-9 w-9 shrink-0 text-mb-action" />
          <span className="min-w-0">
            <span className="block font-mb-display text-xl font-medium leading-tight tracking-[-0.03em] text-mb-ink">StudyLounge</span>
            <span className="block text-[13px] text-mb-body">Yönetim</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="mb-4 flex min-h-11 items-center gap-2.5 rounded-[12px] border border-mb-line bg-mb-surface px-3 text-[15px] text-mb-body transition hover:border-mb-action/40 hover:text-mb-ink"
        >
          <Search className="h-4 w-4" />
          Ara
          <kbd className="ml-auto rounded-[6px] border border-mb-line bg-mb-card px-1.5 text-xs">Ctrl K</kbd>
        </button>

        <p className="mb-2 px-3 text-sm text-mb-body">Menü</p>
        <nav aria-label="Yönetim menüsü" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium transition ${
                  isActive ? 'bg-mb-solid text-mb-on-solid shadow-mb-raised' : 'text-mb-body hover:bg-mb-surface hover:text-mb-ink'
                }`
              }
            >
              {() => (
                <>
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                  <CountBadge count={pending && item.badge ? item.badge(pending) : 0} className="ml-auto" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-mb-line pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={displayName} image={user?.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-mb-ink">{displayName}</p>
              <p className="truncate text-sm text-mb-body">@{user?.username}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <ThemeToggle />
            <Link to="/app/lobbies" className="ml-auto flex h-10 items-center gap-2 rounded-[10px] px-2.5 text-sm font-medium text-mb-body transition hover:bg-mb-surface hover:text-mb-ink">
              <ArrowLeft className="h-4 w-4" />
              Uygulamaya dön
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-mb-line bg-mb-bg lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <LogoMark className="h-8 w-8 text-mb-action" />
              <span className="font-mb-display text-lg font-medium tracking-[-0.03em]">Yönetim</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Ara" className="grid h-10 w-10 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-textDark">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <ThemeToggle />
              <Link to="/app/lobbies" aria-label="Uygulamaya dön" title="Uygulamaya dön" className="grid h-10 w-10 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-textDark">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </Link>
            </div>
          </div>
          <nav aria-label="Yönetim menüsü" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium ${isActive ? 'bg-mb-solid text-mb-on-solid' : 'text-mb-body'}`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <CountBadge count={pending && item.badge ? item.badge(pending) : 0} />
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
          {/* Sayfa değişince içerik yumuşakça belirir */}
          <LazyMotion features={domAnimation} strict>
            <MotionConfig reducedMotion="user">
              <m.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <Outlet />
              </m.div>
            </MotionConfig>
          </LazyMotion>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} links={NAV_ITEMS} />
    </div>
  );
}

function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={`min-w-6 rounded-full bg-softDanger px-1.5 py-0.5 text-center text-xs font-bold tabular-nums text-danger ${className}`} aria-label={`${count} bekleyen`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
