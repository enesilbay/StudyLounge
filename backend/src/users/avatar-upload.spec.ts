import { AVATAR_UPLOAD_TYPES, hasImageSignature } from './avatar-upload';
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('avatar upload checks', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const gif = Buffer.from('GIF89a....');
  const webp = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([1, 2, 3, 4]),
    Buffer.from('WEBP'),
  ]);

  it('accepts files whose content matches their extension', () => {
    expect(hasImageSignature(png, 'a.png')).toBe(true);
    expect(hasImageSignature(jpeg, 'a.JPG')).toBe(true);
    expect(hasImageSignature(jpeg, 'a.jpeg')).toBe(true);
    expect(hasImageSignature(gif, 'a.gif')).toBe(true);
    expect(hasImageSignature(webp, 'a.webp')).toBe(true);
  });

  it('rejects mismatched, scripted and unsupported files', () => {
    expect(hasImageSignature(Buffer.from('<svg onload=alert(1)>'), 'a.png')).toBe(false);
    expect(hasImageSignature(jpeg, 'a.png')).toBe(false);
    expect(hasImageSignature(png, 'a.svg')).toBe(false);
    expect(hasImageSignature(png, 'a.heic')).toBe(false);
    expect(hasImageSignature(Buffer.alloc(0), 'a.png')).toBe(false);
  });

  it('has no SVG or HEIC in the allowlist', () => {
    expect(Object.keys(AVATAR_UPLOAD_TYPES)).not.toContain('.svg');
    expect(Object.keys(AVATAR_UPLOAD_TYPES)).not.toContain('.heic');
  });
});

describe('UpdateAccountSettingsDto', () => {
  const check = (plain: object) =>
    validate(plainToInstance(UpdateAccountSettingsDto, plain));

  it('requires at least 8 characters for a new password', async () => {
    expect(await check({ newPassword: '1234567' })).toHaveLength(1);
    expect(await check({ newPassword: '12345678' })).toHaveLength(0);
  });

  it('accepts fullName and rejects an empty one', async () => {
    expect(await check({ fullName: ' Ada ' })).toHaveLength(0);
    expect(await check({ fullName: '   ' })).toHaveLength(1);
  });
});
