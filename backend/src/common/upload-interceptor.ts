import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Observable } from 'rxjs';

/** "Dosya en fazla 5 MB olabilir." gibi okunur bir sınır metni üretir. */
export function fileSizeMessage(maxBytes: number): string {
  const mb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
  return `Dosya en fazla ${mb} MB olabilir.`;
}

/**
 * `FileInterceptor` ile aynı, ama Multer'ın İngilizce `File too large` (LIMIT_FILE_SIZE)
 * hatasını Türkçe mesaja çevirir. `options.limits.fileSize` kullanılan sınırdır.
 */
export function LimitedFileInterceptor(
  fieldName: string,
  options: MulterOptions & { limits: { fileSize: number } },
): Type<NestInterceptor> {
  const Base = FileInterceptor(fieldName, options);

  @Injectable()
  class LimitedInterceptor extends Base {
    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<unknown>> {
      try {
        return await super.intercept(context, next);
      } catch (error) {
        if (error instanceof PayloadTooLargeException) {
          throw new PayloadTooLargeException(
            fileSizeMessage(options.limits.fileSize),
          );
        }
        throw error;
      }
    }
  }
  return LimitedInterceptor;
}
