import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { User } from '../users/user.entity';
import { StudySession } from './study-session.entity';
import { MAX_SESSIONS, StudyService, dayKey, weekStartKey } from './study.service';
import { Subject } from './subject.entity';

describe('StudyService', () => {
  let service: StudyService;
  let subjects: { createQueryBuilder: jest.Mock; count: jest.Mock; create: jest.Mock; save: jest.Mock; exists: jest.Mock };
  let sessions: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let dailyAnalytics: { findOne: jest.Mock; update: jest.Mock };
  let users: { findOne: jest.Mock; increment: jest.Mock };
  let existingSubject: Subject | null;

  beforeEach(async () => {
    existingSubject = null;
    subjects = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => Promise.resolve(existingSubject)),
      })),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((input: Partial<Subject>) => input),
      save: jest.fn((input: Subject) => Promise.resolve({ ...input, id: input.id ?? 1 })),
      exists: jest.fn().mockResolvedValue(true),
    };
    sessions = {
      create: jest.fn((input: Partial<StudySession>) => input),
      save: jest.fn((input: StudySession) => Promise.resolve(input)),
      find: jest.fn().mockResolvedValue([]),
    };
    dailyAnalytics = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    users = { findOne: jest.fn(), increment: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyService,
        { provide: getRepositoryToken(Subject), useValue: subjects },
        { provide: getRepositoryToken(StudySession), useValue: sessions },
        { provide: getRepositoryToken(DailyAnalytics), useValue: dailyAnalytics },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    service = module.get(StudyService);
  });

  it('computes days and weeks in Turkey time', () => {
    // 2026-10-08 bir persembe.
    expect(weekStartKey(new Date('2026-10-08T12:00:00Z'))).toBe('2026-10-05');
    expect(weekStartKey(new Date('2026-10-11T20:59:00Z'))).toBe('2026-10-05'); // Pazar 23:59 TR
    expect(weekStartKey(new Date('2026-10-11T21:00:00Z'))).toBe('2026-10-12'); // Pazartesi 00:00 TR
    expect(dayKey(new Date('2026-10-08T20:59:00Z'))).toBe('2026-10-08'); // 23:59 TR
    expect(dayKey(new Date('2026-10-08T21:30:00Z'))).toBe('2026-10-09'); // 00:30 TR, ertesi gün
  });

  it('reuses a subject with the same name instead of creating a duplicate', async () => {
    existingSubject = { id: 4, name: 'Fizik', archived: false } as Subject;

    const result = await service.createSubject(3, { name: 'fizik' });

    expect(result).toBe(existingSubject);
    expect(subjects.save).not.toHaveBeenCalled();
  });

  it('records a session with its real duration and drops subjects the user does not own', async () => {
    subjects.exists.mockResolvedValue(false);

    const saved = await service.recordSession({
      userId: 3,
      subjectId: 99,
      roomName: 'Kütüphane',
      startedAt: new Date('2026-10-08T10:00:00Z'),
      endedAt: new Date('2026-10-08T10:25:00Z'),
      creditedMinutes: 50,
      source: 'web',
    });

    expect(saved).toMatchObject({ minutes: 25, creditedMinutes: 50, subject: null, source: 'web' });
  });

  it('rounds session minutes down so 90 seconds is one minute', async () => {
    const saved = await service.recordSession({
      userId: 3,
      startedAt: new Date('2026-10-08T10:00:00Z'),
      endedAt: new Date('2026-10-08T10:01:59Z'),
      creditedMinutes: 1,
      source: 'web',
    });
    expect(saved).toMatchObject({ minutes: 1 });

    await expect(
      service.recordSession({
        userId: 3,
        startedAt: new Date('2026-10-08T10:00:00Z'),
        endedAt: new Date('2026-10-08T10:00:45Z'),
        creditedMinutes: 0,
        source: 'web',
      }),
    ).resolves.toBeNull();
  });

  it('no longer exposes the daily goal reward or goal update', () => {
    expect((service as unknown as Record<string, unknown>).rewardDailyGoalIfReached).toBeUndefined();
    expect((service as unknown as Record<string, unknown>).updateGoals).toBeUndefined();
  });

  it('lists sessions on Istanbul day boundaries and flags truncation', async () => {
    // 2026-10-08 22:30 UTC = 9 Ekim 01:30 TR -> Istanbul gunu 9 Ekim.
    await service.listSessions(3, '2026-10-08T22:30:00Z', '2026-10-10T10:00:00Z');
    const where = (sessions.find.mock.calls[0] as [{ where: { startedAt: { _value: [Date, Date] } } }])[0].where;
    const [start, end] = where.startedAt._value;
    expect(start.toISOString()).toBe('2026-10-08T21:00:00.000Z'); // 9 Ekim 00:00 TR
    expect(end.toISOString()).toBe('2026-10-10T20:59:59.999Z'); // 10 Ekim 23:59:59.999 TR

    const rows = Array.from({ length: MAX_SESSIONS + 1 }, (_, id) => ({ id }));
    sessions.find.mockResolvedValue(rows);
    const result = await service.listSessions(3);
    expect(result.truncated).toBe(true);
    expect(result.sessions).toHaveLength(MAX_SESSIONS);

    sessions.find.mockResolvedValue(rows.slice(0, 5));
    expect((await service.listSessions(3)).truncated).toBe(false);
  });
});
