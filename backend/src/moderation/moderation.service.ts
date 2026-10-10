import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminAuditService,
  RecordActionInput,
} from '../admin-audit/admin-audit.service';
import { Message } from '../messages/message.entity';
import { Friendship } from '../users/friendship.entity';
import { User } from '../users/user.entity';
import { Block } from './block.entity';
import { CreateReportDto } from './dto/moderation.dto';
import { Report, ReportStatus } from './report.entity';

/** Başka kullanıcıların görebileceği alanlar (e-posta asla). */
export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  equippedProfileFrame: true,
} as const;

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Block)
    private readonly blocks: Repository<Block>,
    @InjectRepository(Report)
    private readonly reports: Repository<Report>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendships: Repository<Friendship>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    private readonly audit: AdminAuditService,
  ) {}

  // ── ENGELLEME ──

  async block(userId: number, targetId: number) {
    if (userId === targetId)
      throw new BadRequestException('Kendini engelleyemezsin.');
    const target = await this.users.findOne({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı.');

    await this.blocks
      .createQueryBuilder()
      .insert()
      .values({ blocker: { id: userId }, blocked: { id: targetId } })
      .orIgnore()
      .execute();
    // Engellenen kişiyle arkadaşlık ve bekleyen istekler kalkar.
    await this.friendships.delete({
      sender: { id: userId },
      receiver: { id: targetId },
    });
    await this.friendships.delete({
      sender: { id: targetId },
      receiver: { id: userId },
    });
    return { success: true };
  }

  async unblock(userId: number, targetId: number) {
    await this.blocks.delete({
      blocker: { id: userId },
      blocked: { id: targetId },
    });
    return { success: true };
  }

  listBlocked(userId: number) {
    return this.blocks.find({
      where: { blocker: { id: userId } },
      relations: { blocked: true },
      select: { id: true, createdAt: true, blocked: PUBLIC_USER_SELECT },
      order: { createdAt: 'DESC' },
    });
  }

  /** İki kişiden biri diğerini engellediyse true. */
  async isBlockedEitherWay(a: number, b: number): Promise<boolean> {
    if (!a || !b || a === b) return false;
    return this.blocks.exists({
      where: [
        { blocker: { id: a }, blocked: { id: b } },
        { blocker: { id: b }, blocked: { id: a } },
      ],
    });
  }

  /** `blocker`, `blocked` kişisini engelledi mi (tek yön). */
  isBlockedBy(blocked: number, blocker: number): Promise<boolean> {
    return this.blocks.exists({
      where: { blocker: { id: blocker }, blocked: { id: blocked } },
    });
  }

  /** Kullanıcının engellediği ya da onu engelleyen herkes (aramadan çıkarmak için). */
  async blockedIdsFor(userId: number): Promise<number[]> {
    const rows = await this.blocks.find({
      where: [{ blocker: { id: userId } }, { blocked: { id: userId } }],
      relations: { blocker: true, blocked: true },
      select: { id: true, blocker: { id: true }, blocked: { id: true } },
    });
    return rows.map((row) =>
      row.blocker.id === userId ? row.blocked.id : row.blocker.id,
    );
  }

  async assertNotBlocked(
    a: number,
    b: number,
    message = 'Bu kullanıcıyla etkileşim kapalı.',
  ) {
    if (await this.isBlockedEitherWay(a, b))
      throw new ForbiddenException(message);
  }

  // ── SUSTURMA / YASAK ──

  /** Susturulmuş kullanıcı mesaj yazamaz; kalan süreyi içeren hata fırlatır. */
  async assertCanChat(userId: number) {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, mutedUntil: true },
    });
    if (user?.mutedUntil && user.mutedUntil > new Date()) {
      const until = new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Istanbul',
      }).format(user.mutedUntil);
      throw new ForbiddenException(
        `Mesaj gönderme yetkin ${until} tarihine kadar kapatıldı.`,
      );
    }
  }

  async isBanned(userId: number): Promise<boolean> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, bannedAt: true },
    });
    return Boolean(user?.bannedAt);
  }

  // ── ŞİKAYET ──

  async report(reporterId: number, dto: CreateReportDto) {
    if (reporterId === dto.targetUserId)
      throw new BadRequestException('Kendini şikayet edemezsin.');
    const target = await this.users.findOne({
      where: { id: dto.targetUserId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı.');

    let messageText: string | null = null;
    let roomName: string | null = null;
    if (dto.messageId) {
      const message = await this.messages.findOne({
        where: { id: dto.messageId },
      });
      if (!message || message.user?.id !== dto.targetUserId)
        throw new BadRequestException('Mesaj bu kullanıcıya ait değil.');
      messageText = message.fileName
        ? `[Dosya] ${message.fileName}`
        : message.text;
      roomName = message.roomName;
    }

    // Aynı kişi için açık şikayet varsa yenisi açılmaz, bilgisi güncellenir.
    const existing = await this.reports.findOne({
      where: {
        reporter: { id: reporterId },
        target: { id: dto.targetUserId },
        status: 'open',
      },
    });
    const report =
      existing ??
      this.reports.create({
        reporter: { id: reporterId },
        target: { id: dto.targetUserId },
      });
    Object.assign(report, {
      reason: dto.reason,
      details: dto.details || null,
      messageId: dto.messageId ?? report.messageId ?? null,
      messageText: messageText ?? report.messageText ?? null,
      roomName: roomName ?? report.roomName ?? null,
    });
    await this.reports.save(report);
    return {
      success: true,
      message: 'Şikayetin alındı. Yöneticiler inceleyecek.',
    };
  }

  // ── YÖNETİCİ ──

  listReports(status: ReportStatus | 'all' = 'open') {
    return this.reports.find({
      where: status === 'all' ? {} : { status },
      relations: { reporter: true, target: true, resolvedBy: true },
      select: {
        id: true,
        reason: true,
        details: true,
        messageId: true,
        messageText: true,
        roomName: true,
        status: true,
        resolvedAt: true,
        createdAt: true,
        reporter: PUBLIC_USER_SELECT,
        target: { ...PUBLIC_USER_SELECT, mutedUntil: true, bannedAt: true },
        resolvedBy: { id: true, fullName: true },
      },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async resolveReport(
    adminId: number,
    reportId: number,
    status: 'resolved' | 'dismissed',
  ) {
    const report = await this.reports.findOne({
      where: { id: reportId },
      relations: { target: true },
    });
    if (!report) throw new NotFoundException('Şikayet bulunamadı.');
    report.status = status;
    report.resolvedBy = { id: adminId } as User;
    report.resolvedAt = new Date();
    await this.reports.save(report);
    await this.audit.record({
      adminId,
      targetId: report.target?.id ?? null,
      targetLabel: report.target?.username ?? null,
      action: status === 'resolved' ? 'report_resolve' : 'report_dismiss',
      details: { reportId: report.id, reason: report.reason },
    });
    return { success: true };
  }

  async muteUser(
    adminId: number,
    userId: number,
    hours: number,
    reason?: string,
  ) {
    const target = await this.assertNotSelfOrAdmin(adminId, userId);
    const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    await this.applyAndRecord(
      userId,
      { mutedUntil },
      {
        adminId,
        targetId: userId,
        targetLabel: target.username,
        action: 'mute',
        reason,
        details: { hours, until: mutedUntil.toISOString() },
      },
    );
    return { success: true, mutedUntil };
  }

  async unmuteUser(adminId: number, userId: number, reason?: string) {
    const target = await this.findTarget(userId);
    if (!target.mutedUntil || target.mutedUntil <= new Date())
      return { success: true };
    await this.applyAndRecord(
      userId,
      { mutedUntil: null },
      {
        adminId,
        targetId: userId,
        targetLabel: target.username,
        action: 'unmute',
        reason,
      },
    );
    return { success: true };
  }

  async banUser(adminId: number, userId: number, reason?: string) {
    const target = await this.assertNotSelfOrAdmin(adminId, userId);
    // Zaten yasaklıysa yasak tarihi yenilenmez, kayda ikinci satır yazılmaz.
    if (target.bannedAt) return { success: true };
    await this.applyAndRecord(
      userId,
      { bannedAt: new Date(), isOnline: false },
      {
        adminId,
        targetId: userId,
        targetLabel: target.username,
        action: 'ban',
        reason,
      },
    );
    return { success: true };
  }

  async unbanUser(adminId: number, userId: number, reason?: string) {
    const target = await this.findTarget(userId);
    // Zaten kaldırılmışsa işlem kaydına boş satır yazılmaz.
    if (!target.bannedAt) return { success: true };
    await this.applyAndRecord(
      userId,
      { bannedAt: null },
      {
        adminId,
        targetId: userId,
        targetLabel: target.username,
        action: 'unban',
        reason,
      },
    );
    return { success: true };
  }

  /** Kullanıcıyı günceller ve işlemi aynı transaction'da kayda yazar; biri başarısızsa ikisi de geri alınır. */
  private async applyAndRecord(
    userId: number,
    changes: Partial<User>,
    record: RecordActionInput,
  ) {
    await this.users.manager.transaction(async (manager) => {
      await manager.update(User, userId, changes);
      await this.audit.record(record, manager);
    });
  }

  private async findTarget(userId: number) {
    const user = await this.users.findOne({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        username: true,
        mutedUntil: true,
        bannedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return user;
  }

  private async assertNotSelfOrAdmin(adminId: number, userId: number) {
    if (adminId === userId)
      throw new BadRequestException('Kendine bu işlemi uygulayamazsın.');
    const user = await this.findTarget(userId);
    if (user.role === 'admin')
      throw new ForbiddenException(
        'Başka bir yöneticiye bu işlem uygulanamaz.',
      );
    return user;
  }
}
