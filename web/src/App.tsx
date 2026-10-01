import { useEffect } from 'react';
import AppRouter from './router';
import { useAuthStore } from './store/authStore';
import { LampMark } from './components/ui';

function App() {
  const { initAuth, isInitializing } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LampMark className="h-14 w-14 animate-pulse" />
      </div>
    );
  }

  return (
    <AppRouter />
  );
}

export default App;
