import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { User } from '../users/user.entity';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/study.dto';
import { StudySession } from './study-session.entity';
import { addDaysToKey, localDayEnd, localDayKey, localDayStart, localWeekStartKey } from '../config/time';
import { Subject } from './subject.entity';

const MAX_SUBJECTS = 30;
/** Oturum listesinin tek yanıttaki üst sınırı; aşılırsa yanıt kesilir (X-Truncated). */
export const MAX_SESSIONS = 1000;

/** `daily_analytics.date` ile aynı gün anahtarı (Türkiye saati, YYYY-AA-GG). */
export const dayKey = localDayKey;

/** İçinde bulunulan haftanın pazartesisi (Türkiye saati). */
export const weekStartKey = localWeekStartKey;

export interface RecordSessionInput {
  userId: number;
  subjectId?: number | null;
  roomName?: string | null;
  startedAt: Date;
  endedAt: Date;
  creditedMinutes: number;
  source: 'web' | 'mobile';
}

@Injectable()
export class StudyService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(StudySession)
    private readonly sessions: Repository<StudySession>,
    @InjectRepository(DailyAnalytics)
    private readonly dailyAnalytics: Repository<DailyAnalytics>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  // ── DERSLER ──

  listSubjects(userId: number, includeArchived = false) {
    return this.subjects.find({
      where: { user: { id: userId }, ...(includeArchived ? {} : { archived: false }) },
      order: { createdAt: 'ASC' },
    });
  }

  /** Aynı adlı (büyük/küçük harf duyarsız) ders varsa onu döner; yazarak seçmeyi kolaylaştırır. */
  async createSubject(userId: number, dto: CreateSubjectDto) {
    const existing = await this.subjects
      .createQueryBuilder('subject')
      .where('subject.userId = :userId', { userId })
      .andWhere('LOWER(subject.name) = LOWER(:name)', { name: dto.name })
      .getOne();
    if (existing) {
      if (existing.archived) {
        existing.archived = false;
        return this.subjects.save(existing);
      }
      return existing;
    }

    const count = await this.subjects.count({ where: { user: { id: userId }, archived: false } });
    if (count >= MAX_SUBJECTS) {
      throw new BadRequestException(`En fazla ${MAX_SUBJECTS} ders ekleyebilirsin. Kullanmadıklarını arşivle.`);
    }

    return this.subjects.save(
      this.subjects.create({ user: { id: userId }, name: dto.name, color: dto.color ?? 'blue' }),
    );
  }

  async updateSubject(userId: number, id: number, dto: UpdateSubjectDto) {
    const subject = await this.findOwnedSubject(userId, id);
    Object.assign(subject, dto);
    return this.subjects.save(subject);
  }

  async deleteSubject(userId: number, id: number) {
    const subject = await this.findOwnedSubject(userId, id);
    await this.subjects.remove(subject);
    return { success: true };
  }

  private async findOwnedSubject(userId: number, id: number) {
    const subject = await this.subjects.findOne({ where: { id, user: { id: userId } } });
    if (!subject) throw new NotFoundException('Ders bulunamadı.');
    return subject;
  }

  /** Başkasının dersine oturum/görev bağlanamaz; geçersiz id sessizce derssiz sayılır. */
  async resolveOwnedSubjectId(userId: number, subjectId?: number | null): Promise<number | null> {
    if (!subjectId) return null;
    const exists = await this.subjects.exists({ where: { id: subjectId, user: { id: userId } } });
    return exists ? subjectId : null;
  }

  // ── OTURUMLAR ──

  async recordSession(input: RecordSessionInput) {
    const minutes = Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 60000);
    if (minutes <= 0) return null;
    const subjectId = await this.resolveOwnedSubjectId(input.userId, input.subjectId);

    return this.sessions.save(
      this.sessions.create({
        user: { id: input.userId },
        subject: subjectId ? { id: subjectId } : null,
        roomName: input.roomName ?? null,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        minutes,
        creditedMinutes: input.creditedMinutes,
        source: input.source,
      }),
    );
  }

  /**
   * Oturumlar, Türkiye saatinin gün sınırlarına oturtulur: from ve to hangi Türkiye gününe
   * düşüyorsa o günün başı/sonu alınır. En fazla MAX_SESSIONS satır döner; fazlası varsa
   * truncated true olur (en yeni oturumlar korunur).
   */
  async listSessions(userId: number, from?: string, to?: string) {
    const endKey = dayKey(to ? new Date(to) : new Date());
    const startKey = from ? dayKey(new Date(from)) : addDaysToKey(endKey, -30);
    const rows = await this.sessions.find({
      where: { user: { id: userId }, startedAt: Between(localDayStart(startKey), localDayEnd(endKey)) },
      relations: { subject: true },
      order: { startedAt: 'DESC' },
      take: MAX_SESSIONS + 1,
    });
    const truncated = rows.length > MAX_SESSIONS;
    return { sessions: truncated ? rows.slice(0, MAX_SESSIONS) : rows, truncated };
  }

  /** Analitik sayfası: ders dağılımı (oturumlardan) ve günlük toplamlar (geçmişi de kapsayan günlük özetten). */
  async summary(userId: number, days = 30) {
    // Tek gün sınırı: Türkiye saatine göre bugünden (days - 1) gün öncesinin 00:00'ı.
    const sinceKey = addDaysToKey(dayKey(new Date()), -(days - 1));
    const since = localDayStart(sinceKey);

    const [bySubjectRows, sessionStats, dailyRows] = await Promise.all([
      this.sessions
        .createQueryBuilder('session')
        .leftJoin('session.subject', 'subject')
        .select('subject.id', 'subjectId')
        .addSelect('subject.name', 'name')
        .addSelect('subject.color', 'color')
        .addSelect('SUM(session.minutes)', 'minutes')
        .where('session.userId = :userId', { userId })
        .andWhere('session.startedAt >= :since', { since })
        .groupBy('subject.id')
        .addGroupBy('subject.name')
        .addGroupBy('subject.color')
        .orderBy('minutes', 'DESC')
        .getRawMany<{ subjectId: number | null; name: string | null; color: string | null; minutes: string }>(),
      this.sessions
        .createQueryBuilder('session')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(session.minutes), 0)', 'minutes')
        .where('session.userId = :userId', { userId })
        .andWhere('session.startedAt >= :since', { since })
        .getRawOne<{ count: string; minutes: string }>(),
      this.dailyAnalytics.find({
        where: { user: { id: userId }, date: MoreThanOrEqual(sinceKey) },
        order: { date: 'ASC' },
      }),
    ]);

    return {
      days,
      sessionCount: Number(sessionStats?.count ?? 0),
      sessionMinutes: Number(sessionStats?.minutes ?? 0),
      bySubject: bySubjectRows.map((row) => ({
        subjectId: row.subjectId,
        name: row.name,
        color: row.color,
        minutes: Number(row.minutes),
      })),
      daily: dailyRows.map((row) => ({ date: row.date, minutes: row.focusMinutes })),
    };
  }

  /** Bir derste toplam odak dakikası (Ders Ustası rozeti için). */
  async subjectMinutes(userId: number, subjectId: number): Promise<number> {
    const row = await this.sessions
      .createQueryBuilder('session')
      .select('COALESCE(SUM(session.minutes), 0)', 'minutes')
      .where('session.userId = :userId AND session.subjectId = :subjectId', { userId, subjectId })
      .getRawOne<{ minutes: string }>();
    return Number(row?.minutes ?? 0);
  }

  /** Günlük hedefin tutulduğu gün sayısı (Hedef Avcısı rozeti için). */
  countGoalDays(userId: number): Promise<number> {
    return this.dailyAnalytics.count({ where: { user: { id: userId }, goalRewarded: true } });
  }

  // ── HEDEFLER ──

  async getGoalProgress(userId: number) {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, dailyGoalMinutes: true, weeklyGoalMinutes: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const now = new Date();
    const today = dayKey(now);
    const weekRows = await this.dailyAnalytics.find({
      where: { user: { id: userId }, date: Between(weekStartKey(now), today) },
    });
    const todayRow = weekRows.find((row) => row.date === today);

    return {
      dailyGoalMinutes: user.dailyGoalMinutes,
      weeklyGoalMinutes: user.weeklyGoalMinutes,
      todayMinutes: todayRow?.focusMinutes ?? 0,
      weekMinutes: weekRows.reduce((sum, row) => sum + row.focusMinutes, 0),
      rewardedToday: todayRow?.goalRewarded ?? false,
    };
  }
}
