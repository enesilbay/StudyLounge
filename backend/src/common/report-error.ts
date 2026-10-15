import { HttpException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as Sentry from '@sentry/nestjs';

/**
 * Yakalanip kullaniciya mesaj olarak donulen hatalardan yalnizca beklenmeyenleri
 * Sentry'ye bildirir. Servislerin kasitli firlattigi HttpException/WsException
 * (yanlis sifre, oda dolu vb.) kullanici hatasidir, bildirilmez.
 */
export function reportUnexpected(error: unknown, context?: string): void {
  if (error instanceof HttpException || error instanceof WsException) return;
  Sentry.captureException(error, context ? { tags: { context } } : undefined);
}
