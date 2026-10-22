import {
  AVATAR_FILE_PATTERN,
  characterAvatarPath,
  randomCharacterAvatar,
} from './avatar-characters';

describe('avatar characters', () => {
  it('builds the served path for a character', () => {
    expect(characterAvatarPath(3)).toBe('/avatars/avatar-03.webp');
    expect(characterAvatarPath(10)).toBe('/avatars/avatar-10.webp');
  });

  it('picks odd characters for male and even for female', () => {
    for (let i = 0; i < 50; i += 1) {
      const male = Number(
        /avatar-(\d+)/.exec(randomCharacterAvatar('male'))![1],
      );
      const female = Number(
        /avatar-(\d+)/.exec(randomCharacterAvatar('female'))![1],
      );
      expect(male % 2).toBe(1);
      expect(female % 2).toBe(0);
      expect(male).toBeGreaterThanOrEqual(1);
      expect(female).toBeLessThanOrEqual(10);
    }
  });

  it('only accepts the ten character files', () => {
    expect(AVATAR_FILE_PATTERN.test('avatar-01.webp')).toBe(true);
    expect(AVATAR_FILE_PATTERN.test('avatar-10.webp')).toBe(true);
    expect(AVATAR_FILE_PATTERN.test('avatar-11.webp')).toBe(false);
    expect(AVATAR_FILE_PATTERN.test('../main.js')).toBe(false);
  });
});
