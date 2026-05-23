import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Home, LogOut, Users, ShoppingBag, Trophy, UserRound } from 'lucide-react';
import { Avatar, BrandLockup } from '../ui';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/app/lobbies', icon: Home, label: 'Lobiler' },
  { path: '/app/analytics', icon: BarChart3, label: 'Analitik' },
  { path: '/app/leaderboard', icon: Trophy, label: 'Liderlik' },
  { path: '/app/dm', icon: Users, label: 'Arkadaşlar' },
  { path: '/app/shop', icon: ShoppingBag, label: 'Mağaza' },
  { path: '/app/profile', icon: UserRound, label: 'Profil' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const displayName = user?.fullName ?? 'StudyLounge';

  return (
    <div className="min-h-screen bg-background text-textDark">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-white px-4 py-4 shadow-sm lg:flex lg:flex-col">
        <div className="mb-6">
          <BrandLockup />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex items-center gap-4 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-black transition-all ${
                  isActive
                    ? 'border-primary bg-softIndigo text-primary shadow-sm'
                    : 'border-transparent text-textMuted hover:border-electric/40 hover:bg-background hover:text-textDark'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} image={user?.avatarUrl} frame={user?.equippedProfileFrame} premium={user?.isPremium} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-textDark">{displayName}</p>
              <p className="truncate text-sm font-bold text-textMuted">@{user?.username ?? 'kullanici'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-black text-danger transition hover:bg-softDanger"
          >
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-white/92 backdrop-blur md:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <BrandLockup compact />
            <Avatar name={displayName} image={user?.avatarUrl} frame={user?.equippedProfileFrame} size="sm" premium={user?.isPremium} />
          </div>
        </header>

        <main className="mx-auto min-h-screen w-full max-w-[1180px] px-4 py-5 pb-24 md:px-6 md:py-6 lg:pb-6">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-7 border-t border-border bg-white shadow-sm lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-xs font-black ${isActive ? 'text-primary' : 'text-textMuted'}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
