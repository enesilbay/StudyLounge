import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, unwrapData } from './apiResponses';
import { dotClassFor, formatMinutes } from './study';

describe('unwrapData', () => {
  it('returns the data or user field of an envelope', () => {
    expect(unwrapData({ success: true, data: [1, 2] })).toEqual([1, 2]);
    expect(unwrapData({ success: true, user: { id: 3 } })).toEqual({ id: 3 });
  });

  it('returns plain payloads as they are', () => {
    expect(unwrapData([{ id: 1 }])).toEqual([{ id: 1 }]);
  });
});

describe('getApiErrorMessage', () => {
  it('shows the backend message', () => {
    expect(getApiErrorMessage({ response: { data: { message: 'Şifre hatalı.' } } })).toBe('Şifre hatalı.');
  });

  it('joins validation messages', () => {
    expect(getApiErrorMessage({ response: { data: { message: ['Ad boş olamaz.', 'E-posta geçersiz.'] } } })).toBe('Ad boş olamaz. E-posta geçersiz.');
  });

  it('falls back to a generic message', () => {
    expect(getApiErrorMessage(new Error('network'))).toMatch(/İşlem tamamlanamadı/);
  });
});

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(0)).toBe('0 dk');
    expect(formatMinutes(45)).toBe('45 dk');
    expect(formatMinutes(60)).toBe('1 sa');
    expect(formatMinutes(95)).toBe('1 sa 35 dk');
  });
});

describe('dotClassFor', () => {
  it('maps subject colors to theme token classes and falls back for unknown ones', () => {
    expect(dotClassFor('orange')).toBe('bg-subj-orange');
    expect(dotClassFor('teal')).toBe('bg-subj-blue');
    expect(dotClassFor(null)).toBe('bg-subj-blue');
  });
});
