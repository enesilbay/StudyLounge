import { extname } from 'path';

/** Profil fotoğrafı için izin verilen uzantı -> MIME tipleri (SVG ve HEIC kabul edilmez). */
export const AVATAR_UPLOAD_TYPES: Record<string, string[]> = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
};

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  return (
    buffer.length >= offset + bytes.length &&
    bytes.every((byte, i) => buffer[offset + i] === byte)
  );
}

/** Dosyanın ilk baytları (sihirli bayt) uzantısının söylediği resim türüyle uyuşuyor mu? */
export function hasImageSignature(buffer: Buffer, filename: string): boolean {
  switch (extname(filename).toLowerCase()) {
    case '.png':
      return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case '.jpg':
    case '.jpeg':
      return startsWith(buffer, [0xff, 0xd8, 0xff]);
    case '.gif':
      // "GIF87a" / "GIF89a"
      return (
        startsWith(buffer, [0x47, 0x49, 0x46, 0x38]) &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
      );
    case '.webp':
      // "RIFF" .... "WEBP"
      return (
        startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
      );
    default:
      return false;
  }
}
