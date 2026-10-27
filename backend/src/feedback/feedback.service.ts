import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { Feedback, FeedbackStatus } from './feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly audit: AdminAuditService,
  ) {}

  async create(userId: number, body: CreateFeedbackDto, userAgent?: string) {
    const saved = await this.feedbackRepository.save(
      this.feedbackRepository.create({
        user: { id: userId },
        kind: body.kind,
        message: body.message,
        page: body.page || null,
        userAgent: userAgent?.slice(0, 300) || null,
      }),
    );
    return {
      success: true,
      id: saved.id,
      message: 'Geri bildirimin için teşekkürler!',
    };
  }

  /**
   * Yönetici listesi: en yeniler önce, sayfalı; gönderenin yalnızca herkese açık bilgileri döner.
   * Yanıt her zaman { items, total, page, pageSize }.
   */
  async list(status: FeedbackStatus | 'all', page = 1, pageSize = 25) {
    const size = Math.min(Math.max(pageSize, 1), 100);
    const current = Math.max(page, 1);
    const [items, total] = await this.feedbackRepository.findAndCount({
      where: status === 'all' ? {} : { status },
      relations: { user: true },
      select: {
        id: true,
        kind: true,
        message: true,
        page: true,
        userAgent: true,
        status: true,
        createdAt: true,
        user: { id: true, username: true, fullName: true },
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: size,
      skip: (current - 1) * size,
    });
    return { items, total, page: current, pageSize: size };
  }

  /** Durum değişikliği aynı transaction'da denetim kaydına yazılır. */
  async setStatus(adminId: number, id: number, status: FeedbackStatus) {
    await this.feedbackRepository.manager.transaction(async (manager) => {
      const item = await manager.findOne(Feedback, {
        where: { id },
        relations: { user: true },
        select: { id: true, status: true, user: { id: true, username: true } },
      });
      if (!item) throw new NotFoundException('Geri bildirim bulunamadı.');
      if (item.status === status) return;
      await manager.update(Feedback, id, { status });
      await this.audit.record(
        {
          adminId,
          targetId: item.user?.id ?? null,
          targetLabel: item.user?.username ?? `Geri bildirim #${id}`,
          action: status === 'done' ? 'feedback_done' : 'feedback_reopen',
          details: { feedbackId: id, from: item.status, to: status },
        },
        manager,
      );
    });
    return { success: true };
  }
}
