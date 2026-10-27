import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import type { UserActionConfig } from './UserActionDialog';

/** İşlem tanımı + başarıdan sonra ne olacağı. */
export type WithDone = UserActionConfig & { onDone: () => void };

/** API hatasını iletişim kutusunda gösterilecek mesaja çevirir. */
export async function call(request: () => Promise<unknown>) {
  try {
    await request();
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

interface MuteOptions {
  /** Açılışta seçili süre (saat). */
  hours?: string;
  /** Gerekçe alanının ön değeri. */
  reason?: string;
}

export function muteConfig(id: number, onDone: () => void, options: MuteOptions = {}): WithDone {
  return {
    title: 'Kullanıcıyı sustur',
    description: "Susturulan kişi oda sohbetine ve DM'e yazamaz; odalara girip çalışabilir.",
    confirmLabel: 'Sustur',
    choicesLabel: 'Süre',
    choices: [
      { value: '24', label: '24 saat' },
      { value: '168', label: '7 gün' },
      { value: '720', label: '30 gün' },
    ],
    defaultChoice: options.hours,
    defaultReason: options.reason,
    run: ({ choice, reason }) => call(() => api.post(`/admin/users/${id}/mute`, { hours: Number(choice), reason: reason || undefined })),
    onDone,
  };
}

export function unmuteConfig(id: number, onDone: () => void): WithDone {
  return {
    title: 'Susturmayı kaldır',
    description: 'Kullanıcı yeniden sohbete ve DM’e yazabilir.',
    confirmLabel: 'Susturmayı kaldır',
    run: ({ reason }) => call(() => api.delete(`/admin/users/${id}/mute`, { data: { reason: reason || undefined } })),
    onDone,
  };
}

export function verifyConfig(id: number, onDone: () => void): WithDone {
  return {
    title: 'E-postayı doğrulanmış say',
    description: 'Doğrulama kodu ulaşmayan kullanıcı için. Kullanıcı kodu girmeden giriş yapabilir.',
    confirmLabel: 'Doğrulanmış say',
    run: ({ reason }) => call(() => api.post(`/admin/users/${id}/verify-email`, { reason: reason || undefined })),
    onDone,
  };
}

export function premiumConfig(id: number, hasPremium: boolean, onDone: () => void): WithDone {
  return {
    title: hasPremium ? 'Premium süresini uzat' : 'Premium ver',
    description: hasPremium ? 'Süre, mevcut bitiş tarihinin üstüne eklenir.' : 'Destek amacıyla ücretsiz Premium. Ödeme kaydı oluşmaz.',
    confirmLabel: hasPremium ? 'Uzat' : 'Premium ver',
    choicesLabel: 'Süre',
    choices: [
      { value: 'month', label: '1 ay' },
      { value: 'year', label: '1 yıl' },
      { value: 'unlimited', label: 'Süresiz' },
    ],
    run: ({ choice, reason }) => call(() => api.post(`/admin/users/${id}/premium`, { plan: choice, reason: reason || undefined })),
    onDone,
  };
}

export function revokeConfig(id: number, onDone: () => void): WithDone {
  return {
    title: "Premium'u geri al",
    description: 'Premium hemen kapanır ve kalan süre silinir. Ödeme iadesi yapılmaz.',
    confirmLabel: 'Geri al',
    run: ({ reason }) => call(() => api.post(`/admin/users/${id}/premium/revoke`, { reason: reason || undefined })),
    onDone,
  };
}

export function banConfig(id: number, username: string, onDone: () => void, options: { reason?: string } = {}): WithDone {
  return {
    title: `@${username} yasaklansın mı?`,
    description: 'Yasaklanan hesap giriş yapamaz, açık oturumları hemen kapatılır. Yasak sonradan kaldırılabilir.',
    confirmLabel: 'Yasakla',
    danger: true,
    reasonRequired: true,
    defaultReason: options.reason,
    run: ({ reason }) => call(() => api.post(`/admin/users/${id}/ban`, { reason })),
    onDone,
  };
}

export function unbanConfig(id: number, onDone: () => void): WithDone {
  return {
    title: 'Yasağı kaldır',
    description: 'Kullanıcı yeniden giriş yapabilir.',
    confirmLabel: 'Yasağı kaldır',
    run: ({ reason }) => call(() => api.delete(`/admin/users/${id}/ban`, { data: { reason: reason || undefined } })),
    onDone,
  };
}

/** Rol değişiminde gerekçe iki yönde de zorunlu (yönetici yapma ve düşürme). */
export function roleConfig(id: number, username: string, role: 'user' | 'admin', onDone: () => void): WithDone {
  return {
    title: role === 'admin' ? `@${username} yönetici olsun mu?` : `@${username} kullanıcıya çevrilsin mi?`,
    description:
      role === 'admin'
        ? 'Yönetici bu paneli açar; kullanıcıları susturabilir, yasaklayabilir, Premium verebilir ve hesap silebilir.'
        : 'Kullanıcı yönetim paneline erişimini kaybeder.',
    confirmLabel: role === 'admin' ? 'Yönetici yap' : 'Kullanıcıya çevir',
    danger: role === 'admin',
    reasonRequired: true,
    run: ({ reason }) => call(() => api.patch(`/admin/users/${id}/role`, { role, reason })),
    onDone,
  };
}

export function deleteConfig(id: number, username: string, onDone: () => void): WithDone {
  return {
    title: `@${username} hesabı silinsin mi?`,
    description: 'Oturumlar, dersler, görevler, arkadaşlıklar ve özel mesajlar kalıcı olarak silinir. Geri alınamaz.',
    confirmLabel: 'Hesabı kalıcı olarak sil',
    danger: true,
    reasonRequired: true,
    confirmText: username,
    run: ({ reason, confirmation }) => call(() => api.delete(`/admin/users/${id}`, { data: { confirmation, reason } })),
    onDone,
  };
}
