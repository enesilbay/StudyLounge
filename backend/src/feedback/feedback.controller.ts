import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../moderation/roles.guard';
import { User } from '../users/user.entity';
import {
  CreateFeedbackDto,
  FeedbackQueryDto,
  UpdateFeedbackDto,
} from './dto/feedback.dto';
import { FeedbackService } from './feedback.service';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // Spam olmasin diye kullanici basina 10 dakikada 5 gonderim.
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() body: CreateFeedbackDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.feedbackService.create(user.id, body, userAgent);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/feedback')
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  list(@Query() query: FeedbackQueryDto) {
    return this.feedbackService.list(query.status ?? 'open');
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFeedbackDto,
  ) {
    return this.feedbackService.setStatus(id, body.status);
  }
}
