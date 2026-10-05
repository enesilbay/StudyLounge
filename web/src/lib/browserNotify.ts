/**
 * Sekme arka plandayken tarayıcı bildirimi gösterir. İzin yalnızca kullanıcı bir düğmeye
 * bastığında istenir (ayarlar sayfası); burada sessizce atlanır.
 */
export function browserNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function browserNotificationPermission(): NotificationPermission | 'unsupported' {
  return browserNotificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestBrowserNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!browserNotificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export function notifyInBackground(title: string, body: string, onClick?: () => void) {
  if (!browserNotificationsSupported() || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    const notification = new Notification(title, { body, icon: '/pwa-192x192.png', tag: title });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
  } catch {
    // Bazı mobil tarayıcılar Notification yapıcısını desteklemez (yalnız service worker); yok sayılır.
  }
}
