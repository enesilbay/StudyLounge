/** Sunucunun kabul ettiği profil fotoğrafı türleri ve boyutu (HEIC/SVG yok). */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Seçilen dosya uygunsa `null`, değilse Türkçe hata metni döner. */
export function validateAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return 'Yalnızca JPG, PNG, WebP veya GIF yükleyebilirsin. (HEIC ve SVG desteklenmez.)';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Fotoğraf en fazla 5 MB olabilir.';
  }
  return null;
}
