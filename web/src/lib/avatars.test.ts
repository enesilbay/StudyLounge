import { describe, expect, it } from 'vitest';
import { BACKEND_URL } from './api';
import { avatarSrc, characterAvatarFor, characterAvatarPath } from './avatars';

describe('avatarSrc', () => {
  it('serves characters from the site and uploads from the backend', () => {
    expect(avatarSrc('/avatars/avatar-04.webp')).toBe('/avatars/avatar-04.webp');
    expect(avatarSrc('/uploads/avatar-7-1.png')).toBe(`${BACKEND_URL}/uploads/avatar-7-1.png`);
    expect(avatarSrc('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(avatarSrc(null)).toBeNull();
  });

  it('keeps the name-based fallback stable', () => {
    expect(characterAvatarPath(10)).toBe('/avatars/avatar-10.webp');
    expect(characterAvatarFor('Enes Ilbay')).toBe(characterAvatarFor('  enes ilbay '));
  });
});
