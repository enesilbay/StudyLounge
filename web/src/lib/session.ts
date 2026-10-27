import { setSessionEndHandler } from './api';
import { disconnectSocket } from './socket';
import { useAuthStore } from '../store/authStore';
import { useInboxStore } from '../store/inboxStore';
import { useStudyStore } from '../store/studyStore';

const REASON_KEY = 'sl-cikis-nedeni';
const DEFAULT_REASON = 'Oturumun sona erdi. Devam etmek için yeniden giriş yap.';

let explicitLogout = false;
let logoutRedirect: string | null = null;

function writeReason(reason: string) {
  try {
    sessionStorage.setItem(REASON_KEY, reason);
  } catch {
    // Depolama kapalıysa gerekçe gösterilmez, çıkış yine de yapılır.
  }
}

/** Giriş sayfası: oturumun neden kapandığı (tek seferlik okunur). */
export function consumeLogoutReason(): string | null {
  try {
    const reason = sessionStorage.getItem(REASON_KEY);
    if (reason) sessionStorage.removeItem(REASON_KEY);
    return reason;
  } catch {
    return null;
  }
}

/** Kullanıcı çıkışı kendisi istediyse giriş sonrası eski adrese dönülmez. Render sırasında güvenle okunur. */
export function isExplicitLogout(): boolean {
  return explicitLogout;
}

/** Çıkış sonrası gidilecek özel adres (ör. e-posta doğrulama ekranı); yoksa `/auth`. */
export function getLogoutRedirect(): string | null {
  return logoutRedirect;
}

/** Yeni bir giriş yapıldığında çağrılır. */
export function clearLogoutState() {
  explicitLogout = false;
  logoutRedirect = null;
}

/**
 * Ortak çıkış akışı: oturum, soket ve oturuma bağlı store'lar temizlenir.
 * Menüdeki çıkış, Ayarlar, hesap silme, 401 kesicisi ve `force_logout` hepsi bunu kullanır.
 * `reason` verilirse (sunucu kaynaklı çıkış) giriş sayfasında gösterilir.
 */
export function endSession(options: { reason?: string; explicit?: boolean; redirectTo?: string } = {}) {
  const auth = useAuthStore.getState();
  if (!auth.token && !auth.isAuthenticated) return; // zaten çıkılmış (çift tetiklenme)
  explicitLogout = Boolean(options.explicit);
  logoutRedirect = options.redirectTo ?? null;
  if (!options.explicit) writeReason(options.reason ?? DEFAULT_REASON);
  disconnectSocket();
  useInboxStore.getState().reset();
  useStudyStore.getState().reset();
  auth.logout();
}

/** Yanıt kesicisini ve soket olaylarını ortak çıkış akışına bağlar; uygulama açılışında bir kez çağrılır. */
export function installSessionHandlers() {
  setSessionEndHandler((reason) => endSession({ reason }));
}

/** Giriş sonrası dönüş adresi yalnızca uygulama içi olabilir (açık yönlendirme engellenir); aksi halde lobi. */
export function safeReturnPath(from?: string | null): string {
  if (!from || !/^\/(app|admin)(\/|\?|#|$)/.test(from)) return '/app/lobbies';
  return from;
}
