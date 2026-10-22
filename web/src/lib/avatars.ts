import { assetUrl } from './api';

/**
 * 3B karakter avatarları (public/avatars, 10 karakter; tek numaralar erkek, çift numaralar kadın).
 * Kullanıcı birini seçtiğinde avatarUrl "/avatars/avatar-NN.webp" olur (backend de aynı dosyaları sunar,
 * böylece mobil de gösterir). Seçmeyen kullanıcının karakteri addan hesaplanır; aynı kişi her yerde aynı karakterle görünür.
 * Kaynak görseller: docs/brand/gorseller/oda/avatar*.png
 */
export const CHARACTER_COUNT = 10;

export const CHARACTERS = Array.from({ length: CHARACTER_COUNT }, (_, index) => index + 1);

export function characterAvatarPath(character: number): string {
  return `/avatars/avatar-${String(character).padStart(2, '0')}.webp`;
}

export function characterAvatarFor(key: string): string {
  let hash = 0;
  for (const char of key.trim().toLocaleLowerCase('tr-TR')) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return characterAvatarPath((hash % CHARACTER_COUNT) + 1);
}

/** Kayıtlı avatarın gösterilecek adresi: karakterler sitenin kendisinden, yüklenen fotoğraflar (/uploads/...) backend'den. */
export function avatarSrc(image?: string | null): string | null {
  if (!image) return null;
  if (image.startsWith('/avatars/')) return image;
  return assetUrl(image);
}
