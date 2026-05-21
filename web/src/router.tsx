import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/Layout/AppLayout';
import LandingPage from './pages/LandingPage';
import LobbiesPage from './pages/LobbiesPage';
import FocusRoomPage from './pages/FocusRoomPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ShopPage from './pages/ShopPage';
import AuthPage from './pages/AuthPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DMPage from './pages/DMPage';
import PremiumPage from './pages/PremiumPage';

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
        element: <LobbiesPage />,
      },
      {
        path: 'focus/:roomId',
        element: <FocusRoomPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'leaderboard',
        element: <LeaderboardPage />,
      },
      {
        path: 'shop',
        element: <ShopPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'dm',
        element: <DMPage />,
      },
      {
        path: 'premium',
        element: <PremiumPage />,
      }
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
