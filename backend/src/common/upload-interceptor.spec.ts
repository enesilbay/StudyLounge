import { PayloadTooLargeException } from '@nestjs/common';
import { fileSizeMessage, LimitedFileInterceptor } from './upload-interceptor';

describe('upload-interceptor', () => {
  it('sınır metnini megabayt olarak yazar', () => {
    expect(fileSizeMessage(5 * 1024 * 1024)).toBe('Dosya en fazla 5 MB olabilir.');
    expect(fileSizeMessage(20 * 1024 * 1024)).toBe('Dosya en fazla 20 MB olabilir.');
  });

  it('Multer LIMIT_FILE_SIZE hatasını Türkçe mesaja çevirir', async () => {
    const Interceptor = LimitedFileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } });
    const instance = new Interceptor();
    const base = Object.getPrototypeOf(Interceptor.prototype) as { intercept: jest.Mock };
    jest.spyOn(base, 'intercept').mockRejectedValue(new PayloadTooLargeException('File too large'));

    await expect(instance.intercept({} as never, {} as never)).rejects.toMatchObject({
      message: 'Dosya en fazla 5 MB olabilir.',
    });
  });
});
