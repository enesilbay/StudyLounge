import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/Layout/AppLayout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage, { RouteErrorPage } from './pages/NotFoundPage';
import { getLogoutRedirect, isExplicitLogout } from './lib/session';

// Uygulama içi sayfalar ilk ziyarette yüklenir; açılış ve giriş sayfası hemen gelir.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default });

/** Sayfa doğrudan bir uygulama içi adresle açıldığında, sayfa kodu yüklenirken gösterilir. */
const PageLoading = () => (
  <div className="grid min-h-screen place-items-center bg-mb-bg">
    <Loader2 className="h-6 w-6 animate-spin text-mb-action" aria-label="Sayfa yükleniyor" />
  </div>
);

/** Yönetim kodu yalnızca yönetici rolündeki hesaba indirilir; diğerleri sayfa parçasını hiç görmez (veri zaten API'de korunur). */
const isAdminUser = () => useAuthStore.getState().user?.role === 'admin';
const adminPage = (load: () => Promise<{ default: React.ComponentType }>) => async () =>
  isAdminUser() ? page(load)() : { Component: AdminDenied };

function AdminDenied() {
  // Girişsiz kullanıcı önce girişe (dönüş adresi /admin kalır), yönetici olmayan uygulamaya gönderilir.
  return (
    <ProtectedRoute>
      <Navigate to="/app/lobbies" replace />
    </ProtectedRoute>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    // Girişten sonra gidilmek istenen adres (iyzico dönüşü gibi sorgu parametreleri dahil) korunur;
    // kullanıcı kendi isteğiyle çıktıysa korunmaz.
    const from = isExplicitLogout() ? undefined : `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={getLogoutRedirect() ?? '/auth'} replace state={from ? { from } : undefined} />;
  }
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app',
    hydrateFallbackElement: <PageLoading />,
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: <Navigate to="/app/lobbies" replace />,
      },
      {
        path: 'lobbies',
        lazy: page(() => import('./pages/LobbiesPage')),
      },
      {
        path: 'focus/:roomId',
        lazy: page(() => import('./pages/FocusRoomPage')),
      },
      {
        path: 'profile',
        lazy: page(() => import('./pages/ProfilePage')),
      },
      {
        path: 'leaderboard',
        lazy: page(() => import('./pages/LeaderboardPage')),
      },
      {
        path: 'shop',
        lazy: page(() => import('./pages/ShopPage')),
      },
      {
        path: 'analytics',
        lazy: page(() => import('./pages/AnalyticsPage')),
      },
      {
        path: 'dm',
        lazy: page(() => import('./pages/DMPage')),
      },
      {
        path: 'premium',
        lazy: page(() => import('./pages/PremiumPage')),
      },
      {
        path: 'settings',
        lazy: page(() => import('./pages/SettingsPage')),
      },
      {
        path: 'u/:userId',
        lazy: page(() => import('./pages/UserProfilePage')),
      },
      {
        // Eski adres: yönetim paneli artık uygulamadan ayrı (/admin).
        path: 'admin',
        element: <Navigate to="/admin" replace />,
      },
      {
        path: '*',
        element: <NotFoundPage inApp />,
      },
    ],
  },
  {
    path: '/admin',
    hydrateFallbackElement: <PageLoading />,
    errorElement: <RouteErrorPage />,
    // Yönetim paneli kodu yalnızca yönetici rolündeki hesap açtığında yüklenir (rol kontrolü indirmeden önce).
    lazy: async () => {
      if (!isAdminUser()) return { Component: AdminDenied };
      const { default: AdminLayout } = await import('./components/admin/AdminLayout');
      return {
        Component: () => (
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        ),
      };
    },
    children: [
      {
        index: true,
        lazy: adminPage(() => import('./pages/admin/AdminOverviewPage')),
      },
      {
        path: 'users',
        lazy: adminPage(() => import('./pages/admin/AdminUsersPage')),
        children: [
          {
            path: ':userId',
            lazy: adminPage(() => import('./pages/admin/AdminUserDetail')),
          },
        ],
      },
      {
        path: 'rooms',
        lazy: adminPage(() => import('./pages/admin/AdminRoomsPage')),
      },
      {
        path: 'announcements',
        lazy: adminPage(() => import('./pages/admin/AdminAnnouncementsPage')),
      },
      {
        path: 'moderation',
        lazy: adminPage(() => import('./pages/admin/AdminModerationPage')),
      },
      {
        path: 'actions',
        lazy: adminPage(() => import('./pages/admin/AdminActionsPage')),
      },
      {
        path: '*',
        element: <NotFoundPage inApp />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
