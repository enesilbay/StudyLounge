import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';

/** Dosya anahtari: yalnizca harf, rakam, nokta, alt cizgi ve tire (dizin gezintisi olmaz). */
export const STORAGE_KEY_PATTERN = /^[\w-]+(\.[a-z0-9]+)?$/i;

/** Uzantidan icerik tipi. Yukleyenin gonderdigi tipe guvenilmez. */
const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function contentTypeFor(key: string): string {
  return (
    CONTENT_TYPES[extname(key).toLowerCase()] ?? 'application/octet-stream'
  );
}

export interface StoredFile {
  body: Readable;
  contentType: string;
  contentLength?: number;
}

/**
 * Yuklenen dosyalar (avatar, sohbet dosyasi, ders notu PDF'i).
 * S3_BUCKET tanimliysa S3 uyumlu depoya (Backblaze B2, Cloudflare R2...) yazar;
 * degilse gelistirme icin yerel ./uploads klasorunu kullanir.
 * Veritabaninda adres her iki durumda da "/uploads/<anahtar>" bicimindedir;
 * dosyayi backend'in GET /uploads/:key ucu sunar (mobil ve web degismeden calisir).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string | undefined;
  private readonly localDir = join(process.cwd(), 'uploads');

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('S3_BUCKET') || undefined;
    if (this.bucket) {
      this.s3 = new S3Client({
        endpoint: configService.get<string>('S3_ENDPOINT') || undefined,
        region: configService.get<string>('S3_REGION') || 'auto',
        // https://<endpoint>/<bucket>/<key> bicimi: B2, R2, MinIO ve Supabase'in hepsi destekler.
        forcePathStyle: true,
        credentials: {
          accessKeyId: configService.get<string>('S3_ACCESS_KEY_ID') ?? '',
          secretAccessKey:
            configService.get<string>('S3_SECRET_ACCESS_KEY') ?? '',
        },
      });
      this.logger.log(`Dosyalar S3 deposuna yaziliyor (${this.bucket}).`);
    } else {
      this.logger.warn(
        'S3_BUCKET tanimli degil: dosyalar yerel ./uploads klasorune yaziliyor (deploy sonrasi kalici degil).',
      );
    }
  }

  /** Tahmin edilemeyen, benzersiz bir anahtar uretir: <onek>-<zaman>-<rastgele><.uzanti> */
  createKey(prefix: string, originalName: string): string {
    const ext = extname(originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    return `${prefix}-${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
  }

  async put(key: string, body: Buffer): Promise<string> {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentTypeFor(key),
        }),
      );
    } else {
      await mkdir(this.localDir, { recursive: true });
      await writeFile(join(this.localDir, key), body);
    }
    return `/uploads/${key}`;
  }

  async get(key: string): Promise<StoredFile> {
    if (!STORAGE_KEY_PATTERN.test(key)) throw new NotFoundException();
    if (this.s3) {
      try {
        const result = await this.s3.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        return {
          body: result.Body as Readable,
          contentType: contentTypeFor(key),
          contentLength: result.ContentLength,
        };
      } catch (error) {
        if (error instanceof NoSuchKey) throw new NotFoundException();
        throw error;
      }
    }
    const path = join(this.localDir, key);
    const info = await stat(path).catch(() => null);
    if (!info?.isFile()) throw new NotFoundException();
    return {
      body: createReadStream(path),
      contentType: contentTypeFor(key),
      contentLength: info.size,
    };
  }

  /** "/uploads/<anahtar>" adresindeki dosyayi siler; bulunamazsa sessizce gecer. */
  async removeByUrl(url: string | null | undefined): Promise<void> {
    const key = url?.startsWith('/uploads/')
      ? url.slice('/uploads/'.length)
      : null;
    if (!key || !STORAGE_KEY_PATTERN.test(key)) return;
    try {
      if (this.s3) {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
      } else {
        await unlink(join(this.localDir, key));
      }
    } catch {
      // Dosya zaten yoksa onemli degil.
    }
  }
}
