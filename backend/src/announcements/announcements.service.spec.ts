import { announcementStatus } from './announcements.service';

describe('announcementStatus', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const at = (iso: string) => new Date(iso);

  it('başlangıcı gelmemiş duyuru planlıdır', () => {
    expect(
      announcementStatus(
        { startsAt: at('2026-10-14T13:00:00Z'), endsAt: at('2026-10-14T14:00:00Z') },
        now,
      ),
    ).toBe('scheduled');
  });

  it('başlamış ve bitmemiş duyuru yayındadır', () => {
    expect(
      announcementStatus(
        { startsAt: at('2026-10-14T11:00:00Z'), endsAt: at('2026-10-14T13:00:00Z') },
        now,
      ),
    ).toBe('live');
  });

  it('bitiş anı geldiğinde duyuru biter', () => {
    expect(
      announcementStatus(
        { startsAt: at('2026-10-14T10:00:00Z'), endsAt: at('2026-10-14T12:00:00Z') },
        now,
      ),
    ).toBe('ended');
  });
});
