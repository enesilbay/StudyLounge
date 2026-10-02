import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Crown, DoorOpen, LogOut, MessageCircle, Settings, ShoppingBag, Trophy, UserRound } from 'lucide-react';
import { Avatar, BrandLockup, ThemeToggle } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { disconnectSocket } from '../../lib/socket';

const navItems = [
  { path: '/app/lobbies', icon: DoorOpen, label: 'Odalar' },
  { path: '/app/dm', icon: MessageCircle, label: 'Arkadaşlar' },
  { path: '/app/leaderboard', icon: Trophy, label: 'Sıralama' },
  { path: '/app/analytics', icon: BarChart3, label: 'Analitik' },
  { path: '/app/shop', icon: ShoppingBag, label: 'Mağaza' },
  { path: '/app/profile', icon: UserRound, label: 'Profil' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const displayName = user?.fullName ?? 'StudyLounge';
  // Odak odası tüm genişliği kullanır; diğer sayfalar okunabilir bir sütunda kalır.
  const wide = location.pathname.startsWith('/app/focus/');

  const handleLogout = () => {
    disconnectSocket();
    logout();
  };

  return (
    <div className="min-h-screen bg-background text-textDark">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <div className="mb-8 px-2">
          <BrandLockup />
        </div>

        <nav aria-label="Ana menü" className="flex flex-1 flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
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
                </>
              )}
            </NavLink>
          ))}

          {!user?.isPremium ? (
            <NavLink to="/app/premium" className="mt-4 flex items-center gap-3 rounded-lg border border-accent/35 px-3 py-2.5 text-[15px] font-semibold text-accentDark transition hover:bg-lightAmber">
              <Crown className="h-[18px] w-[18px]" />
              Premium'a geç
            </NavLink>
          ) : null}
        </nav>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={displayName} image={user?.avatarUrl} frame={user?.equippedProfileFrame} size="sm" premium={user?.isPremium} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-textDark">{displayName}</p>
              <p className="truncate text-sm text-textMuted">@{user?.username ?? 'kullanici'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <ThemeToggle />
            <NavLink to="/app/settings" aria-label="Ayarlar" title="Ayarlar" className="grid h-10 w-10 place-items-center rounded-lg text-textMuted transition hover:bg-sunken hover:text-textDark">
              <Settings className="h-[18px] w-[18px]" />
            </NavLink>
            <button onClick={handleLogout} className="ml-auto flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-textMuted transition hover:bg-softDanger hover:text-danger">
              <LogOut className="h-4 w-4" />
              Çıkış yap
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <BrandLockup compact />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NavLink to="/app/settings" aria-label="Ayarlar" className="grid h-10 w-10 place-items-center rounded-lg text-textMuted">
                <Settings className="h-[18px] w-[18px]" />
              </NavLink>
            </div>
          </div>
        </header>

        <main className={`mx-auto min-h-screen w-full px-4 py-6 pb-24 md:px-8 md:py-8 lg:pb-8 ${wide ? 'max-w-[1500px]' : 'max-w-[1120px]'}`}>
          <Outlet />
        </main>

        <nav aria-label="Ana menü" className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-6 border-t border-border bg-surface lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-textMuted'}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
