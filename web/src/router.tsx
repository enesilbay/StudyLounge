import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/Layout/AppLayout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';

// Uygulama içi sayfalar ilk ziyarette yüklenir; açılış ve giriş sayfası hemen gelir.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default });

/** Sayfa doğrudan bir uygulama içi adresle açıldığında, sayfa kodu yüklenirken gösterilir. */
const PageLoading = () => (
  <div className="grid min-h-screen place-items-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Sayfa yükleniyor" />
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/app',
    hydrateFallbackElement: <PageLoading />,
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
      }
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
