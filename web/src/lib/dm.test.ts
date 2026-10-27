import { describe, expect, it, vi } from 'vitest';
import { sendDm, type DmSocketLike } from './dm';

function fakeSocket(connected: boolean, reply: (ack: (error: Error | null, response?: { ok: boolean; error?: string }) => void) => void) {
  const emit = vi.fn((_event: string, _payload: unknown, ack: Parameters<ReturnType<DmSocketLike['timeout']>['emit']>[2]) => reply(ack));
  const socket: DmSocketLike = { connected, timeout: () => ({ emit }) };
  return { socket, emit };
}

describe('sendDm', () => {
  it('başarıda ok döner ve metni kırpıp gönderir', async () => {
    const { socket, emit } = fakeSocket(true, (ack) => ack(null, { ok: true }));
    await expect(sendDm(socket, 5, '  selam  ')).resolves.toEqual({ ok: true, message: undefined });
    expect(emit).toHaveBeenCalledWith('send_dm', { targetUserId: 5, text: 'selam' }, expect.any(Function));
  });

  it('sunucu reddederse hata metnini döndürür', async () => {
    const { socket } = fakeSocket(true, (ack) => ack(null, { ok: false, error: 'Bu kullanıcıya mesaj gönderemezsin.' }));
    await expect(sendDm(socket, 5, 'merhaba')).resolves.toEqual({ ok: false, error: 'Bu kullanıcıya mesaj gönderemezsin.' });
  });

  it('zaman aşımında hata döner', async () => {
    const { socket } = fakeSocket(true, (ack) => ack(new Error('timeout')));
    const result = await sendDm(socket, 5, 'merhaba');
    expect(result.ok).toBe(false);
  });

  it('bağlantı yokken hiç göndermeden hata döner', async () => {
    const { socket, emit } = fakeSocket(false, () => undefined);
    const result = await sendDm(socket, 5, 'merhaba');
    expect(result.ok).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it('2000 karakterden uzun metni göndermez', async () => {
    const { socket, emit } = fakeSocket(true, (ack) => ack(null, { ok: true }));
    const result = await sendDm(socket, 5, 'a'.repeat(2001));
    expect(result.ok).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });
});
