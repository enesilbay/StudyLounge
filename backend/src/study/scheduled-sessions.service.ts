import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Lobby } from '../lobbies/lobby.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CreateScheduledSessionDto } from './dto/study.dto';
import { ScheduledSession, ScheduledSessionInvite } from './scheduled-session.entity';

/** Planlar en fazla bu kadar ileriye kurulabilir. */
const MAX_DAYS_AHEAD = 60;
/** Başlamadan bu kadar önce hatırlatma gönderilir. */
export const REMINDER_LEAD_MS = 10 * 60 * 1000;

const PUBLIC_USER_FIELDS = { id: true, username: true, fullName: true, avatarUrl: true, equippedProfileFrame: true } as const;

@Injectable()
export class ScheduledSessionsService {
  private readonly logger = new Logger(ScheduledSessionsService.name);

  constructor(
    @InjectRepository(ScheduledSession)
    private readonly sessions: Repository<ScheduledSession>,
    @InjectRepository(ScheduledSessionInvite)
    private readonly invites: Repository<ScheduledSessionInvite>,
    @InjectRepository(Lobby)
    private readonly lobbies: Repository<Lobby>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Sahibi olduğum ya da davet edildiğim, henüz bitmemiş planlar (en yakın önce). */
  async listUpcoming(userId: number) {
    // En uzun oturum 4 saat; o kadar önce başlamış olanlar hâlâ sürüyor olabilir.
    const since = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const rows = await this.sessions
      .createQueryBuilder('session')
      .leftJoin('session.invites', 'mine', 'mine.userId = :userId', { userId })
      .where('session.startsAt > :since', { since })
      .andWhere(
        new Brackets((qb) => {
          qb.where('session.ownerId = :userId', { userId }).orWhere('mine.id IS NOT NULL');
        }),
      )
      .select('session.id', 'id')
      .getRawMany<{ id: number }>();

    if (!rows.length) return [];
    const sessions = await this.sessions.find({
      where: rows.map((row) => ({ id: row.id })),
      relations: { owner: true, lobby: true, invites: { user: true } },
      select: {
        id: true,
        title: true,
        startsAt: true,
        durationMinutes: true,
        createdAt: true,
        owner: PUBLIC_USER_FIELDS,
        lobby: { id: true, name: true },
        invites: { id: true, status: true, user: PUBLIC_USER_FIELDS },
      },
      order: { startsAt: 'ASC' },
    });
    // Sürmekte olanlar dahil, bitmiş olanlar listelenmez.
    const now = Date.now();
    return sessions.filter((session) => session.startsAt.getTime() + session.durationMinutes * 60000 > now);
  }

  async create(ownerId: number, dto: CreateScheduledSessionDto) {
    const startsAt = new Date(dto.startsAt);
    const now = Date.now();
    if (startsAt.getTime() < now - 60_000) {
      throw new BadRequestException('Geçmiş bir saate plan kurulamaz.');
    }
    if (startsAt.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(`En fazla ${MAX_DAYS_AHEAD} gün sonrasına plan kurabilirsin.`);
    }

    // Yalnızca arkadaşlar davet edilebilir.
    const inviteeIds = [...new Set(dto.inviteeIds ?? [])].filter((id) => id !== ownerId);
    if (inviteeIds.length) {
      const friendIds = new Set((await this.usersService.getFriends(ownerId)).map((friend) => friend.id));
      if (inviteeIds.some((id) => !friendIds.has(id))) {
        throw new ForbiddenException('Yalnızca arkadaşlarını davet edebilirsin.');
      }
    }

    let lobby: Lobby | null = null;
    if (dto.lobbyId) {
      lobby = await this.lobbies.findOne({ where: { id: dto.lobbyId } });
      if (!lobby) throw new NotFoundException('Oda bulunamadı.');
    }

    const session = await this.sessions.save(
      this.sessions.create({
        owner: { id: ownerId },
        title: dto.title,
        startsAt,
        durationMinutes: dto.durationMinutes,
        lobby,
      }),
    );
    if (inviteeIds.length) {
      await this.invites.save(inviteeIds.map((userId) => this.invites.create({ session: { id: session.id }, user: { id: userId } })));
      void this.pushToUsers(inviteeIds, 'Çalışma daveti', `"${dto.title}" oturumuna davet edildin.`, { type: 'scheduled_session', sessionId: session.id });
    }
    return this.findForUser(ownerId, session.id);
  }

  async respond(userId: number, sessionId: number, status: 'accepted' | 'declined') {
    const invite = await this.invites.findOne({ where: { session: { id: sessionId }, user: { id: userId } } });
    if (!invite) throw new NotFoundException('Bu plana davetin yok.');
    invite.status = status;
    await this.invites.save(invite);
    return this.findForUser(userId, sessionId);
  }

  async remove(userId: number, sessionId: number) {
    const session = await this.sessions.findOne({ where: { id: sessionId }, relations: { owner: true } });
    if (!session) throw new NotFoundException('Plan bulunamadı.');
    if (session.owner.id !== userId) throw new ForbiddenException('Planı yalnızca kuran kişi silebilir.');
    await this.sessions.remove(session);
    return { success: true };
  }

  private async findForUser(userId: number, sessionId: number) {
    const session = (await this.listUpcoming(userId)).find((item) => item.id === sessionId);
    if (!session) throw new NotFoundException('Plan bulunamadı.');
    return session;
  }

  /**
   * Dakikada bir: 10 dakika içinde başlayacak ve hatırlatması gitmemiş planlar için
   * sahibine ve daveti kabul edenlere mobil bildirim gönderir. Web istemcisi aynı
   * hatırlatmayı plan listesinden kendisi gösterir.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminders() {
    const now = new Date();
    const due = await this.sessions.find({
      where: {
        reminderSentAt: IsNull(),
        startsAt: LessThanOrEqual(new Date(now.getTime() + REMINDER_LEAD_MS)),
      },
      relations: { owner: true, invites: { user: true } },
      take: 100,
    });
    const upcoming = due.filter((session) => session.startsAt > now);

    // Başlama saati geçmiş olanlara artık hatırlatma gitmez; tekrar taranmasınlar.
    const stale = due.filter((session) => session.startsAt <= now).map((session) => session.id);
    if (stale.length) await this.sessions.update(stale, { reminderSentAt: now });

    for (const session of upcoming) {
      const claimed = await this.sessions.update({ id: session.id, reminderSentAt: IsNull(), startsAt: MoreThan(now) }, { reminderSentAt: now });
      if (!claimed.affected) continue;
      const userIds = [session.owner.id, ...session.invites.filter((invite) => invite.status === 'accepted').map((invite) => invite.user.id)];
      const minutes = Math.max(1, Math.round((session.startsAt.getTime() - now.getTime()) / 60000));
      void this.pushToUsers(userIds, 'Oturum yaklaşıyor', `"${session.title}" ${minutes} dakika sonra başlıyor.`, { type: 'scheduled_session', sessionId: session.id });
    }
  }

  private async pushToUsers(userIds: number[], title: string, body: string, data: Record<string, unknown>) {
    try {
      const tokens = await this.usersService.getUserPushTokens(userIds);
      await Promise.all(tokens.map((token) => this.notificationsService.sendNotification(token, title, body, data)));
    } catch (error) {
      this.logger.warn(`Plan bildirimi gönderilemedi: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
