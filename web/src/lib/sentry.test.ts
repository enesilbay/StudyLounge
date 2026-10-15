import { describe, expect, it } from 'vitest';
import { shouldDrop, stripQuery } from './sentry';

describe('sentry', () => {
  it('URL sorgu ve parça kısmını atar', () => {
    expect(stripQuery('https://site.app/reset?token=abc#x')).toBe('https://site.app/reset');
    expect(stripQuery('https://site.app/app/lobbies')).toBe('https://site.app/app/lobbies');
  });

  it('API hatalarını ve eski sayfa parçası hatalarını göndermez', () => {
    expect(shouldDrop({ isAxiosError: true, message: 'Request failed with status code 400' })).toBe(true);
    expect(shouldDrop(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true);
  });

  it('beklenmeyen hataları gönderir', () => {
    expect(shouldDrop(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(shouldDrop('metin')).toBe(false);
  });
});
