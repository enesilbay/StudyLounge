import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { User } from '../users/user.entity';
import { StudySession } from './study-session.entity';
import { DAILY_GOAL_BONUS, StudyService, dayKey, weekStartKey } from './study.service';
import { Subject } from './subject.entity';

describe('StudyService', () => {
  let service: StudyService;
  let subjects: { createQueryBuilder: jest.Mock; count: jest.Mock; create: jest.Mock; save: jest.Mock; exists: jest.Mock };
  let sessions: { create: jest.Mock; save: jest.Mock };
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
      save: jest.fn((input: Subject) => Promise.resolve({ id: 1, ...input })),
      exists: jest.fn().mockResolvedValue(true),
    };
    sessions = { create: jest.fn((input: Partial<StudySession>) => input), save: jest.fn((input: StudySession) => Promise.resolve(input)) };
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

  it('computes the Monday of the current week', () => {
    // 2026-10-08 bir persembe.
    expect(weekStartKey(new Date('2026-10-08T12:00:00Z'))).toBe('2026-10-05');
    expect(weekStartKey(new Date('2026-10-05T00:30:00Z'))).toBe('2026-10-05');
    expect(weekStartKey(new Date('2026-10-11T23:00:00Z'))).toBe('2026-10-05');
    expect(dayKey(new Date('2026-10-08T23:59:00Z'))).toBe('2026-10-08');
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

  it('rewards the daily goal once when it is reached', async () => {
    users.findOne.mockResolvedValue({ id: 3, dailyGoalMinutes: 60 });
    dailyAnalytics.findOne.mockResolvedValue({ id: 8, focusMinutes: 75, goalRewarded: false });

    await expect(service.rewardDailyGoalIfReached(3)).resolves.toBe(true);
    expect(users.increment).toHaveBeenCalledWith({ id: 3 }, 'coins', DAILY_GOAL_BONUS);
  });

  it('does not reward when the goal is off, not reached or already rewarded', async () => {
    users.findOne.mockResolvedValue({ id: 3, dailyGoalMinutes: 0 });
    await expect(service.rewardDailyGoalIfReached(3)).resolves.toBe(false);

    users.findOne.mockResolvedValue({ id: 3, dailyGoalMinutes: 60 });
    dailyAnalytics.findOne.mockResolvedValue({ id: 8, focusMinutes: 30, goalRewarded: false });
    await expect(service.rewardDailyGoalIfReached(3)).resolves.toBe(false);

    dailyAnalytics.findOne.mockResolvedValue({ id: 8, focusMinutes: 90, goalRewarded: true });
    await expect(service.rewardDailyGoalIfReached(3)).resolves.toBe(false);

    // Ayni anda iki istek: ikincisi satiri guncelleyemez, ikinci kez odul verilmez.
    dailyAnalytics.findOne.mockResolvedValue({ id: 8, focusMinutes: 90, goalRewarded: false });
    dailyAnalytics.update.mockResolvedValue({ affected: 0 });
    await expect(service.rewardDailyGoalIfReached(3)).resolves.toBe(false);

    expect(users.increment).not.toHaveBeenCalled();
  });
});
