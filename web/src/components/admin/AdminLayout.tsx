import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, ShieldAlert, type LucideIcon } from 'lucide-react';
import { Avatar, BrandLockup, StateBlock, ThemeToggle } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { useAdminPending, type AdminPending } from '../../lib/admin';

interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: (pending: AdminPending) => number;
}

// Menüde yalnızca çalışan bölümler görünür; Kullanıcılar, Odalar, Ödemeler ve İşlem kaydı kendi aşamalarında eklenir.
const NAV_ITEMS: AdminNavItem[] = [
  { path: '/admin', label: 'Genel bakış', icon: LayoutDashboard, end: true },
  { path: '/admin/moderation', label: 'Moderasyon', icon: ShieldAlert, badge: (p) => p.openReports + p.openFeedback },
];

/** Yönetim paneli: uygulamadan ayrı, sol menülü düzen. Yalnızca yöneticiler görür. */
export default function AdminLayout() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const pending = useAdminPending((state) => state.pending);
  const refreshPending = useAdminPending((state) => state.refresh);

  useEffect(() => {
    if (isAdmin) void refreshPending();
  }, [isAdmin, refreshPending]);

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-textDark">
        <div className="w-full max-w-lg">
          <StateBlock
            title="Bu sayfa yöneticilere açık"
            description="Hesabının yönetici yetkisi yok."
            action={
              <Link to="/app/lobbies" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-onPrimary hover:bg-secondary">
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
    <div className="min-h-screen bg-background text-textDark">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <div className="mb-8 px-2">
          <BrandLockup />
          <p className="mt-1.5 pl-[42px] text-sm font-semibold text-textMuted">Yönetim</p>
        </div>

        <nav aria-label="Yönetim menüsü" className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition ${
                  isActive ? 'bg-softIndigo text-textDark' : 'text-textMuted hover:bg-sunken hover:text-textDark'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : ''}`} />
                  {item.label}
                  <CountBadge count={pending && item.badge ? item.badge(pending) : 0} className="ml-auto" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={displayName} image={user?.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-textDark">{displayName}</p>
              <p className="truncate text-sm text-textMuted">@{user?.username}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <ThemeToggle />
            <Link to="/app/lobbies" className="ml-auto flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-textMuted transition hover:bg-sunken hover:text-textDark">
              <ArrowLeft className="h-4 w-4" />
              Uygulamaya dön
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <BrandLockup compact />
              <span className="text-sm font-semibold text-textMuted">Yönetim</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link to="/app/lobbies" aria-label="Uygulamaya dön" title="Uygulamaya dön" className="grid h-10 w-10 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-textDark">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </Link>
            </div>
          </div>
          <nav aria-label="Yönetim menüsü" className="flex gap-1 overflow-x-auto px-3 pb-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-softIndigo text-textDark' : 'text-textMuted'}`
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
          <Outlet />
        </main>
      </div>
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
