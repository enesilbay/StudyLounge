import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../../lib/api';
import AdminAnnouncementsPage from '../../pages/admin/AdminAnnouncementsPage';
import { defaultEnd } from './announcementTime';
import { lastPageOf, parsePaged, usePagedList } from './pagedList';
import { ReportsPanel } from './ReportsPanel';
import { banConfig, roleConfig } from './userActions';

vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const del = vi.mocked(api.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parsePaged', () => {
  it('yeni sayfalı yanıtı okur', () => {
    expect(parsePaged({ items: [1, 2], total: 7, page: 2, pageSize: 2 }, 2, 2)).toEqual({ items: [1, 2], total: 7, page: 2, pageSize: 2 });
  });

  it('geçiş döneminde düz diziyi tek sayfa sayar', () => {
    const paged = parsePaged<number>([1, 2, 3], 3, 25);
    expect(paged).toMatchObject({ items: [1, 2, 3], total: 3, page: 1 });
    expect(lastPageOf(paged.total, paged.pageSize)).toBe(1);
  });

  it('beklenmeyen gövdede boş liste döner', () => {
    expect(parsePaged(null, 1, 25).items).toEqual([]);
  });

  it('lastPageOf en az 1 döner', () => {
    expect(lastPageOf(0, 25)).toBe(1);
    expect(lastPageOf(51, 25)).toBe(3);
  });
});

describe('duyuru bitiş varsayılanı', () => {
  it('başlangıç boşsa verilen andan itibaren hesaplar', () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(defaultEnd('', 24, now).getTime()).toBe(now + 24 * 3600 * 1000);
  });

  it('başlangıç varsa ondan hesaplar', () => {
    const start = new Date(2026, 5, 1, 9, 0).toISOString();
    expect(defaultEnd(start, 1, 0).getTime()).toBe(new Date(start).getTime() + 3600 * 1000);
  });
});

describe('işlem tanımları', () => {
  it('rol değişiminde gerekçe iki yönde de zorunlu', () => {
    expect(roleConfig(1, 'ali', 'admin', () => undefined).reasonRequired).toBe(true);
    expect(roleConfig(1, 'ali', 'user', () => undefined).reasonRequired).toBe(true);
  });

  it('yasak metni açık oturumların kapanacağını söyler', () => {
    const config = banConfig(1, 'ali', () => undefined);
    expect(config.description).toContain('açık oturumları hemen kapatılır');
    expect(config.description).not.toContain('reddedilir');
  });
});

const report = {
  id: 7,
  reason: 'spam',
  details: null,
  messageText: 'merhaba',
  roomName: null,
  status: 'open',
  createdAt: '2026-01-01T10:00:00.000Z',
  resolvedAt: null,
  reporter: { id: 2, username: 'bora', fullName: 'Bora', avatarUrl: null },
  target: { id: 3, username: 'cem', fullName: 'Cem', avatarUrl: null, mutedUntil: null, bannedAt: null },
  resolvedBy: null,
};

describe('ReportsPanel', () => {
  it('yasak düğmesi doğrudan istek atmaz; onay ve gerekçe penceresi açar', async () => {
    get.mockResolvedValue({ data: { items: [report], total: 1, page: 1, pageSize: 25 } });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ReportsPanel />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Yasakla' }));
    expect(post).not.toHaveBeenCalled();
    expect(await screen.findByText('@cem yasaklansın mı?')).toBeInTheDocument();
    // Gerekçe şikayet numarasıyla dolu gelir; onaylayınca istek gerekçeyle gider.
    post.mockResolvedValue({ data: {} });
    await user.click(screen.getAllByRole('button', { name: 'Yasakla' }).at(-1)!);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/admin/users/3/ban', { reason: 'Şikayet #7' }));
  });

  it('düz dizi yanıtıyla da çalışır', async () => {
    get.mockResolvedValue({ data: [report] });
    render(
      <MemoryRouter>
        <ReportsPanel />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Cem')).toBeInTheDocument();
  });

  it('hata durumunu boş durumdan ayırır ve tekrar denemeyi sunar', async () => {
    get.mockRejectedValueOnce(new Error('ağ'));
    get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 25 } });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ReportsPanel />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Şikayetler yüklenemedi')).toBeInTheDocument();
    expect(screen.queryByText('Açık şikayet yok')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Açık şikayet yok')).toBeInTheDocument();
  });
});

describe('usePagedList', () => {
  it('sayfa son sayfayı aşarsa onOverflow ile son sayfayı bildirir', async () => {
    get.mockResolvedValue({ data: { items: [], total: 30, page: 5, pageSize: 25 } });
    const onOverflow = vi.fn();
    renderHook(() => usePagedList('/admin/x', {}, 5, 25, onOverflow));
    await waitFor(() => expect(onOverflow).toHaveBeenCalledWith(2));
  });

  it('eski isteğin yanıtı yenisini ezmez', async () => {
    let resolveFirst: (value: unknown) => void = () => undefined;
    get.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    get.mockResolvedValueOnce({ data: { items: ['yeni'], total: 1, page: 1, pageSize: 25 } });
    const { result, rerender } = renderHook(({ q }) => usePagedList<string>('/admin/x', { q }, 1, 25), { initialProps: { q: 'a' } });
    rerender({ q: 'b' });
    await waitFor(() => expect(result.current.data?.items).toEqual(['yeni']));
    resolveFirst({ data: { items: ['eski'], total: 1, page: 1, pageSize: 25 } });
    await Promise.resolve();
    expect(result.current.data?.items).toEqual(['yeni']);
  });
});

describe('AdminAnnouncementsPage', () => {
  const row = (id: number, status: 'scheduled' | 'live', message: string) => ({
    id,
    message,
    tone: 'info',
    startsAt: '2026-01-01T10:00:00.000Z',
    endsAt: '2099-01-01T10:00:00.000Z',
    createdAt: '2026-01-01T09:00:00.000Z',
    status,
    createdBy: { id: 1, username: 'admin' },
  });

  it('planlı duyuruda İptal et silme ucunu çağırır; yayındakinde Şimdi bitir PATCH atar', async () => {
    get.mockResolvedValue({ data: [row(1, 'scheduled', 'Planlı'), row(2, 'live', 'Yayında')] });
    del.mockResolvedValue({ data: {} });
    const patch = vi.mocked(api.patch);
    patch.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<AdminAnnouncementsPage />);
    await user.click(await screen.findByRole('button', { name: /İptal et/ }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/admin/announcements/1'));
    expect(patch).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: /Şimdi bitir/ }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/admin/announcements/2', { endsAt: expect.any(String) as string }));
  });

  it('liste hatası boş durum gibi görünmez', async () => {
    get.mockRejectedValue(new Error('ağ'));
    render(<AdminAnnouncementsPage />);
    expect(await screen.findByText('Duyurular yüklenemedi')).toBeInTheDocument();
    expect(screen.queryByText('Henüz duyuru yok')).toBeNull();
  });

  it('düzenle penceresi PATCH ile kaydeder', async () => {
    get.mockResolvedValue({ data: [row(5, 'live', 'Eski metin')] });
    const patch = vi.mocked(api.patch);
    patch.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<AdminAnnouncementsPage />);
    await user.click(await screen.findByRole('button', { name: 'Düzenle' }));
    const field = await screen.findByDisplayValue('Eski metin');
    await user.clear(field);
    await user.type(field, 'Yeni metin');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/admin/announcements/5', expect.objectContaining({ message: 'Yeni metin', tone: 'info' })));
  });
});
