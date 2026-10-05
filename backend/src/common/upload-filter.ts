import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import type { Express } from 'express';

/** Uzanti -> izin verilen MIME tipleri. Statik sunucu icerik tipini uzantidan belirledigi icin ikisi birlikte kontrol edilir. */
const IMAGE_TYPES: Record<string, string[]> = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
  '.heic': ['image/heic', 'image/heif'],
  '.heif': ['image/heic', 'image/heif'],
};

const DOCUMENT_TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

export const AVATAR_UPLOAD_TYPES = IMAGE_TYPES;
export const CHAT_UPLOAD_TYPES = { ...IMAGE_TYPES, ...DOCUMENT_TYPES };

/** Multer `fileFilter`: listede olmayan uzanti veya MIME tipindeki dosyayi diske yazmadan reddeder. */
export function createUploadFileFilter(allowed: Record<string, string[]>) {
  return (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    const mimeTypes = allowed[extname(file.originalname).toLowerCase()];
    if (!mimeTypes?.includes(file.mimetype)) {
      cb(new BadRequestException('Bu dosya türü yüklenemez.'), false);
      return;
    }
    cb(null, true);
  };
}
