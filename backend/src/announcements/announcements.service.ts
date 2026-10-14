import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { User } from '../users/user.entity';
import { Announcement } from './announcement.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './announcements.dto';

export type AnnouncementStatus = 'scheduled' | 'live' | 'ended';

export function announcementStatus(item: Pick<Announcement, 'startsAt' | 'endsAt'>, now = new Date()): AnnouncementStatus {
  if (item.startsAt > now) return 'scheduled';
  if (item.endsAt <= now) return 'ended';
  return 'live';
}

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly repo: Repository<Announcement>,
    private readonly audit: AdminAuditService,
  ) {}

  /** Şu an yayındaki duyurular (uygulama istemcileri için). */
  active() {
    const now = new Date();
    return this.repo.find({
      where: { startsAt: LessThanOrEqual(now), endsAt: MoreThan(now) },
      select: { id: true, message: true, tone: true, endsAt: true },
      order: { startsAt: 'DESC', id: 'DESC' },
      take: 3,
    });
  }

  /** Yönetici listesi; her satıra yayın durumu eklenir. */
  async list() {
    const items = await this.repo.find({
      relations: { createdBy: true },
      select: {
        id: true,
        message: true,
        tone: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        createdBy: { id: true, username: true },
      },
      order: { startsAt: 'DESC', id: 'DESC' },
      take: 100,
    });
    const now = new Date();
    return items.map((item) => ({ ...item, status: announcementStatus(item, now) }));
  }

  private assertWindow(startsAt: Date, endsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) throw new BadRequestException('Geçersiz tarih.');
    if (endsAt <= startsAt) throw new BadRequestException('Bitiş, başlangıçtan sonra olmalı.');
  }

  async create(adminId: number, dto: CreateAnnouncementDto) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = new Date(dto.endsAt);
    this.assertWindow(startsAt, endsAt);
    if (endsAt <= new Date()) throw new BadRequestException('Bitiş zamanı geçmişte olamaz.');
    const saved = await this.repo.save(
      this.repo.create({ message: dto.message, tone: dto.tone ?? 'info', startsAt, endsAt, createdBy: { id: adminId } as User }),
    );
    await this.audit.record({
      adminId,
      targetLabel: `Duyuru #${saved.id}`,
      action: 'announcement_create',
      details: { announcementId: saved.id, message: saved.message },
    });
    return { id: saved.id, message: saved.message, tone: saved.tone, startsAt, endsAt, status: announcementStatus(saved) };
  }

  async update(adminId: number, id: number, dto: UpdateAnnouncementDto) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Duyuru bulunamadı.');
    if (dto.message !== undefined) item.message = dto.message;
    if (dto.tone !== undefined) item.tone = dto.tone;
    if (dto.startsAt) item.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) item.endsAt = new Date(dto.endsAt);
    this.assertWindow(item.startsAt, item.endsAt);
    const saved = await this.repo.save(item);
    await this.audit.record({
      adminId,
      targetLabel: `Duyuru #${saved.id}`,
      action: 'announcement_update',
      details: { announcementId: saved.id, message: saved.message },
    });
    return { id: saved.id, message: saved.message, tone: saved.tone, startsAt: saved.startsAt, endsAt: saved.endsAt, status: announcementStatus(saved) };
  }

  async remove(adminId: number, id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Duyuru bulunamadı.');
    await this.repo.delete(id);
    await this.audit.record({
      adminId,
      targetLabel: `Duyuru #${id}`,
      action: 'announcement_delete',
      details: { announcementId: id, message: item.message },
    });
    return { id, deleted: true };
  }
}
