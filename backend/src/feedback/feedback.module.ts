import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../moderation/roles.guard';
import {
  AdminFeedbackController,
  FeedbackController,
} from './feedback.controller';
import { Feedback } from './feedback.entity';
import { FeedbackService } from './feedback.service';

/** Uygulama içi geri bildirim (hata bildir / öneri) ve yönetici listesi. */
@Module({
  imports: [TypeOrmModule.forFeature([Feedback])],
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService, RolesGuard],
})
export class FeedbackModule {}
