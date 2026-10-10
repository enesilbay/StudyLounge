import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { Feedback, FeedbackStatus } from './feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
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

  /** Yönetici listesi: en yeniler önce; gönderenin yalnızca herkese açık bilgileri döner. */
  list(status: FeedbackStatus | 'all') {
    return this.feedbackRepository.find({
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
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async setStatus(id: number, status: FeedbackStatus) {
    const result = await this.feedbackRepository.update(id, { status });
    if (!result.affected)
      throw new NotFoundException('Geri bildirim bulunamadı.');
    return { success: true };
  }
}
