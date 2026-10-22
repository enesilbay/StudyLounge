import { useEffect, useState, type ReactNode } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, Crown, DoorOpen, LogOut, MessageCircle, Moon, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, ShoppingBag, Sun, Trophy, UserRound } from 'lucide-react';
import { Avatar } from '../ui';
import { LogoMark } from '../brand/Logo';
import { useAuthStore } from '../../store/authStore';
import { disconnectSocket } from '../../lib/socket';
import { useTheme } from '../../lib/theme';
import { useInboxStore } from '../../store/inboxStore';
import ToastStack from './ToastStack';
import { FeedbackButton } from './FeedbackButton';
import { AnnouncementBanner } from './AnnouncementBanner';
import { useStudyStore } from '../../store/studyStore';
import { useAppNotifications } from './useAppNotifications';

// Her sayfanın kendi pastel rengi (mb-tile-*); menüde ikon rozeti, seçiliyken satırın zemini olur.
const navItems = [
  { path: '/app/lobbies', icon: DoorOpen, label: 'Odalar', tile: 'bg-mb-tile-7' },
  { path: '/app/dm', icon: MessageCircle, label: 'Arkadaşlar', tile: 'bg-mb-tile-2' },
  { path: '/app/leaderboard', icon: Trophy, label: 'Sıralama', tile: 'bg-mb-tile-5' },
  { path: '/app/analytics', icon: BarChart3, label: 'Analitik', tile: 'bg-mb-tile-1' },
  { path: '/app/shop', icon: ShoppingBag, label: 'Mağaza', tile: 'bg-mb-tile-4' },
  { path: '/app/profile', icon: UserRound, label: 'Profil', tile: 'bg-mb-tile-6' },
];


const COLLAPSE_KEY = 'sl-menu-daraltilmis';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

const iconButton = 'grid h-10 w-10 place-items-center rounded-[12px] text-mb-body transition hover:bg-mb-surface hover:text-mb-ink';

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  useAppNotifications();
  // Arkadaşlar sekmesindeki rozet: okunmamış sohbetler + bekleyen istekler.
  const friendsBadge = useInboxStore((state) => state.unreadFrom.length + state.friendRequests.length);
  const badgeFor = (path: string) => (path === '/app/dm' ? friendsBadge : 0);
  const displayName = user?.fullName ?? 'StudyLounge';
  // Odalar panosu tüm genişliği kullanır; diğer sayfalar okunabilir bir sütunda kalır.
  const wide = location.pathname.startsWith('/app/lobbies');

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // Tarayıcı depolaması kapalıysa tercih yalnızca bu oturumda kalır.
    }
  }, [collapsed]);

  const handleLogout = () => {
    disconnectSocket();
    useInboxStore.getState().reset();
    useStudyStore.getState().reset();
    logout();
  };

  // Odak odası dikkat dağıtmasın: menü ve üst çubuk yok, odadan çıkış düğmesi sayfanın kendisinde.
  if (location.pathname.startsWith('/app/focus/')) {
    return (
      <div className="sl-yeni min-h-dvh bg-mb-surface text-mb-ink">
        <AppMotion>
          <Outlet />
        </AppMotion>
        <ToastStack />
      </div>
    );
  }

  return (
    <div className="sl-yeni min-h-screen bg-mb-bg text-mb-ink">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[12px] focus:bg-mb-action focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-mb-on-action">
        İçeriğe geç
      </a>
      {/* ── Sol menü (geniş ekran) ── */}
      <aside
        className={`sl-yeni fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-mb-line bg-mb-bg py-5 transition-[width] duration-300 ease-out lg:flex ${
          collapsed ? 'w-[76px] px-3' : 'w-64 px-4'
        }`}
      >
        <Link to="/app/lobbies" className={`mb-7 flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-2'}`} aria-label="StudyLounge, Odalar">
          <LogoMark className="h-9 w-9 shrink-0 text-mb-action" />
          {collapsed ? null : <span className="font-mb-display text-xl font-medium tracking-[-0.03em] text-mb-ink">StudyLounge</span>}
        </Link>

        {collapsed ? null : <p className="mb-2 px-3 text-sm text-mb-body">Menü</p>}
        <nav aria-label="Ana menü" className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group relative flex min-h-11 items-center gap-3 rounded-[14px] text-[15px] font-medium transition ${collapsed ? 'justify-center' : 'px-2'} ${
                  isActive ? `${item.tile} text-mb-ink shadow-mb-card` : 'text-mb-body hover:bg-mb-surface hover:text-mb-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-mb-ink transition-transform group-hover:scale-110 ${isActive ? 'bg-mb-card/85 shadow-mb-card' : item.tile}`}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
                  <NavBadge count={badgeFor(item.path)} className={collapsed ? 'absolute -right-1 -top-1' : 'ml-auto'} />
                </>
              )}
            </NavLink>
          ))}

          {user?.role === 'admin' ? (
            <NavLink
              to="/admin"
              title={collapsed ? 'Yönetim' : undefined}
              className={`mt-4 flex min-h-11 items-center gap-3 rounded-[14px] text-[15px] font-medium text-mb-body transition hover:bg-mb-surface hover:text-mb-ink ${collapsed ? 'justify-center' : 'px-2'}`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-mb-tile-8 text-mb-ink">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className={collapsed ? 'sr-only' : ''}>Yönetim</span>
            </NavLink>
          ) : null}

          {!user?.isPremium ? (
            <NavLink
              to="/app/premium"
              title={collapsed ? "Premium'a geç" : undefined}
              className={`relative mt-4 flex min-h-11 items-center gap-3 overflow-hidden rounded-[14px] bg-mb-solid text-[15px] font-medium text-mb-on-solid shadow-mb-raised transition hover:-translate-y-0.5 ${collapsed ? 'justify-center' : 'px-2'}`}
            >
              <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-mb-lamp opacity-30 blur-2xl" />
              <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-mb-lamp text-mb-solid">
                <Crown className="h-4 w-4" />
              </span>
              <span className={`relative ${collapsed ? 'sr-only' : ''}`}>Premium'a geç</span>
            </NavLink>
          ) : null}
        </nav>


        <div className="border-t border-mb-line pt-4">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-1'}`}>
            <Avatar name={displayName} image={user?.avatarUrl} frame={user?.equippedProfileFrame} size="sm" premium={user?.isPremium} />
            {collapsed ? null : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-mb-ink">{displayName}</p>
                <p className="truncate text-sm text-mb-body">@{user?.username ?? 'kullanici'}</p>
              </div>
            )}
          </div>
          <div className={`mt-3 flex gap-1 ${collapsed ? 'flex-col items-center' : 'items-center'}`}>
            <NavLink to="/app/settings" aria-label="Ayarlar" title="Ayarlar" className={iconButton}>
              <Settings className="h-[18px] w-[18px]" />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              title="Çıkış yap"
              aria-label="Çıkış yap"
              className={`flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-medium text-mb-body transition hover:bg-softDanger hover:text-danger ${collapsed ? 'w-10' : 'ml-auto px-3'}`}
            >
              <LogOut className="h-4 w-4" />
              {collapsed ? null : 'Çıkış'}
            </button>
          </div>
        </div>
      </aside>

      <div className={`transition-[padding] duration-300 ease-out ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}>
        {/* ── Üst çubuk (her sayfada) ── */}
        {/* Bulanık zemin (backdrop-filter) içindeki modalı çubuğa hapsettiği için düz zemin. */}
        <header className="sl-yeni sticky top-0 z-20 border-b border-mb-line bg-mb-bg">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
                title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
                aria-pressed={collapsed}
                className={`${iconButton} hidden lg:grid`}
              >
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
              <Link to="/app/lobbies" className="flex items-center gap-2 lg:hidden" aria-label="StudyLounge, Odalar">
                <LogoMark className="h-8 w-8 text-mb-action" />
                <span className="font-mb-display text-lg font-medium tracking-[-0.03em]">StudyLounge</span>
              </Link>
            </div>

            <div className="flex items-center gap-1.5">
              {user?.role === 'admin' ? (
                <NavLink to="/admin" aria-label="Yönetim" title="Yönetim" className={`${iconButton} lg:hidden`}>
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </NavLink>
              ) : null}
              <NavLink to="/app/dm" aria-label={friendsBadge ? `Bildirimler, ${friendsBadge} yeni` : 'Bildirimler'} title="Bildirimler" className={`${iconButton} relative`}>
                <Bell className="h-[18px] w-[18px]" />
                {friendsBadge ? <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-mb-bg" /> : null}
              </NavLink>
              <FeedbackButton />
              <NavLink to="/app/settings" aria-label="Ayarlar" title="Ayarlar" className={`${iconButton} lg:hidden`}>
                <Settings className="h-[18px] w-[18px]" />
              </NavLink>
              <ThemeSwitch />
              <Link to="/app/profile" aria-label="Profil" title="Profil" className="ml-1 hidden rounded-full md:block">
                <Avatar name={displayName} image={user?.avatarUrl} frame={user?.equippedProfileFrame} size="xs" />
              </Link>
            </div>
          </div>
        </header>

        <AnnouncementBanner />

        <main id="icerik" tabIndex={-1} className={`outline-none mx-auto min-h-screen w-full px-4 py-6 pb-24 md:px-8 md:py-8 lg:pb-8 ${wide ? 'max-w-[1600px]' : 'max-w-[1120px]'}`}>
          <AppMotion>
          <Outlet />
        </AppMotion>
        </main>

        {/* ── Alt menü (telefon) ── */}
        <nav aria-label="Ana menü" className="sl-yeni fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-6 border-t border-mb-line bg-mb-bg lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-mb-ink' : 'text-mb-body'}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`relative grid h-7 w-11 place-items-center rounded-full transition ${isActive ? item.tile : ''}`}>
                    <item.icon className="h-5 w-5" />
                    <NavBadge count={badgeFor(item.path)} className="absolute -right-1.5 -top-1.5" />
                  </span>
                  <span className="max-w-full truncate px-0.5">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <ToastStack />
    </div>
  );
}

/** Referanstaki "Tema" düğmesi: yazı + yeşil kare içinde güneş/ay. */
function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-10 items-center gap-2 rounded-[12px] border border-mb-line bg-mb-bg pl-3 pr-1 text-sm font-medium text-mb-ink transition hover:bg-mb-surface"
    >
      <span className="hidden sm:inline">Tema</span>
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-mb-action text-mb-on-action">
        {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}

function NavBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span aria-label={`${count} yeni`} className={`grid h-5 min-w-5 place-items-center rounded-full bg-mb-action px-1 text-[11px] font-bold text-mb-on-action ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

/** Sayfa animasyonları: framer-motion'ın küçük paketi bir kez yüklenir; "hareketi azalt" açıkken hepsi durur. */
function AppMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
