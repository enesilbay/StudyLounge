import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../lib/theme';

/** Google Identity Services (accounts.google.com/gsi/client) için kullandığımız kadar tip. */
interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void; ux_mode?: 'popup'; auto_select?: boolean }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { type: 'standard'; theme: 'outline' | 'filled_black'; size: 'large'; text: 'continue_with'; shape: 'rectangular'; width: number; locale: string },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google girişi yüklenemedi.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Google ile giriş düğmesi. VITE_GOOGLE_CLIENT_ID tanımlı değilse hiçbir şey göstermez. */
export function GoogleSignInButton({ onCredential, onError }: { onCredential: (credential: string) => void; onError: (message: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const { theme } = useTheme();
  // Google düğmesi bir kez çizilir; en güncel geri çağırmalar ref üzerinden okunur.
  const handlers = useRef({ onCredential, onError });
  useEffect(() => {
    handlers.current = { onCredential, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const container = containerRef.current;
        if (cancelled || !container || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          ux_mode: 'popup',
          callback: (response) => handlers.current.onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(400, Math.max(200, container.clientWidth)),
          locale: 'tr',
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFailed(true);
        handlers.current.onError(error instanceof Error ? error.message : 'Google girişi yüklenemedi.');
      });
    return () => {
      cancelled = true;
    };
  }, [theme]);

  if (!CLIENT_ID || failed) return null;

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-sm text-textMuted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        ya da
        <span className="h-px flex-1 bg-border" />
      </div>
      <div ref={containerRef} className="flex min-h-11 justify-center" />
    </div>
  );
}
