import { describe, expect, it } from 'vitest';
import type { Message } from '../types';
import { addMessage, hasServerId, mergeMessages, normalizeSocketMessage } from './messages';

const msg = (over: Partial<Message>): Message => ({ id: 1, text: 'merhaba', userId: 7, createdAt: '2026-10-27T10:00:00.000Z', ...over });

describe('oda mesajları', () => {
  it('kimliksiz canlı mesaja negatif yerel kimlik verir', () => {
    const local = normalizeSocketMessage({ text: 'x', userId: 1 } as Message, 'Oda');
    expect(local.id).toBeLessThan(0);
    expect(hasServerId(local)).toBe(false);
  });

  it('kendi yüklediği dosya, soket yankısıyla çift görünmez', () => {
    const saved = msg({ id: 40, type: 'file', fileUrl: '/uploads/a.pdf', text: 'a.pdf' });
    const echo = normalizeSocketMessage({ ...saved, id: undefined as unknown as number }, 'Oda');
    expect(addMessage([saved], echo)).toHaveLength(1);
  });

  it('gerçek kimlikli kayıt, kimliksiz kaydın yerine geçer', () => {
    const local = normalizeSocketMessage({ text: 'a', userId: 7, fileUrl: '/uploads/a.png' } as Message, 'Oda');
    const result = addMessage([local], msg({ id: 9, text: 'a', fileUrl: '/uploads/a.png' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(9);
  });

  it('geçmiş yüklenirken araya giren canlı mesaj ezilmez', () => {
    const history = [msg({ id: 1, text: 'eski', createdAt: '2026-10-27T10:00:00.000Z' })];
    const live = [normalizeSocketMessage({ text: 'canlı', userId: 8, createdAt: '2026-10-27T10:05:00.000Z' } as Message, 'Oda')];
    const merged = mergeMessages(history, live);
    expect(merged.map((m) => m.text)).toEqual(['eski', 'canlı']);
  });

  it('geçmişte zaten bulunan canlı mesaj tekrarlanmaz', () => {
    const history = [msg({ id: 5, text: 'selam', userId: 8, createdAt: '2026-10-27T10:05:01.000Z' })];
    const live = [normalizeSocketMessage({ text: 'selam', userId: 8, createdAt: '2026-10-27T10:05:00.000Z' } as Message, 'Oda')];
    expect(mergeMessages(history, live)).toHaveLength(1);
  });
});
