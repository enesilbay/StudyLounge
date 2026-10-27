import { describe, expect, it } from 'vitest';
import { AVATAR_MAX_BYTES, validateAvatarFile } from './avatarFile';

describe('validateAvatarFile', () => {
  it('kabul edilen türleri geçirir', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(validateAvatarFile({ type, size: 1000 })).toBeNull();
    }
  });

  it('HEIC ve SVG dosyalarını Türkçe mesajla reddeder', () => {
    expect(validateAvatarFile({ type: 'image/heic', size: 1000 })).toMatch(/JPG, PNG/);
    expect(validateAvatarFile({ type: 'image/svg+xml', size: 1000 })).toMatch(/JPG, PNG/);
  });

  it('5 MB üstünü reddeder', () => {
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES })).toBeNull();
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toBe('Fotoğraf en fazla 5 MB olabilir.');
  });
});
