import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Readable } from 'stream';
import { contentTypeFor, StorageService } from './storage.service';

const readAll = async (stream: Readable) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
};

describe('StorageService (yerel disk)', () => {
  let dir: string;
  let service: StorageService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sl-storage-'));
    jest.spyOn(process, 'cwd').mockReturnValue(dir);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    service = new StorageService({
      get: () => undefined,
    } as unknown as ConfigService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('writes, serves and removes a file under /uploads', async () => {
    const key = service.createKey('file', 'Ders Notu.PDF');
    expect(key).toMatch(/^file-\d+-[0-9a-f]{16}\.pdf$/);

    const url = await service.put(key, Buffer.from('merhaba'));
    expect(url).toBe(`/uploads/${key}`);
    expect(await readFile(join(dir, 'uploads', key), 'utf8')).toBe('merhaba');

    const file = await service.get(key);
    expect(file.contentType).toBe('application/pdf');
    expect(file.contentLength).toBe(7);
    expect(await readAll(file.body)).toBe('merhaba');

    await service.removeByUrl(url);
    await expect(service.get(key)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects keys that could escape the folder', async () => {
    await expect(service.get('../secret.pdf')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.get('a/b.pdf')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.removeByUrl('/uploads/../x')).resolves.toBeUndefined();
  });

  it('derives the content type from the extension, not the upload', () => {
    expect(contentTypeFor('a.png')).toBe('image/png');
    expect(contentTypeFor('a.html')).toBe('application/octet-stream');
  });
});
