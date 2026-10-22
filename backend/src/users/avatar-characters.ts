/**
 * Hazir 3B karakter avatarlari (1-10). Secilen karakter avatarUrl'e "/avatars/avatar-NN.webp"
 * olarak yazilir; dosyalari AvatarsController sunar. Boylece mobil de eski kodla
 * (assetUrl(avatarUrl)) karakteri gosterir; yeni kolon gerekmez.
 * Tek sayilar erkek, cift sayilar kadin karakterdir (kayitta rastgele secim icin).
 */
export const AVATAR_CHARACTER_COUNT = 10;

export const AVATAR_FILE_PATTERN = /^avatar-(0[1-9]|10)\.webp$/;

export function characterAvatarPath(character: number): string {
  return `/avatars/avatar-${String(character).padStart(2, '0')}.webp`;
}

export const AVATAR_GROUPS = ['female', 'male'] as const;
export type AvatarGroup = (typeof AVATAR_GROUPS)[number];

/** Kayitta secilen gruptan rastgele bir karakter (erkek: tek, kadin: cift numaralar). */
export function randomCharacterAvatar(group: AvatarGroup): string {
  const index = Math.floor(Math.random() * (AVATAR_CHARACTER_COUNT / 2));
  return characterAvatarPath(index * 2 + (group === 'male' ? 1 : 2));
}
