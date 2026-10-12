/**
 * Fotoğrafı olmayan kullanıcıların 3B karakter avatarı (public/avatars, 10 karakter).
 * Karakter addan hesaplanır; aynı kişi her yerde (oda, sohbet, sıralama, profil) aynı karakterle görünür.
 * Kaynak görseller: docs/brand/gorseller/oda/avatar*.png
 */
const CHARACTER_COUNT = 10;

export function characterAvatarFor(key: string): string {
  let hash = 0;
  for (const char of key.trim().toLocaleLowerCase('tr-TR')) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return `/avatars/avatar-${String((hash % CHARACTER_COUNT) + 1).padStart(2, '0')}.webp`;
}
