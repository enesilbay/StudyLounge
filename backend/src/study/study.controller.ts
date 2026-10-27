import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateSubjectDto, SessionsQueryDto, UpdateSubjectDto } from './dto/study.dto';
import { StudyService } from './study.service';

@UseGuards(JwtAuthGuard)
@Controller('study')
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Get('subjects')
  listSubjects(@CurrentUser() user: User, @Query('archived') archived?: string) {
    return this.studyService.listSubjects(user.id, archived === 'true');
  }

  @Post('subjects')
  createSubject(@CurrentUser() user: User, @Body() body: CreateSubjectDto) {
    return this.studyService.createSubject(user.id, body);
  }

  @Patch('subjects/:id')
  updateSubject(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateSubjectDto) {
    return this.studyService.updateSubject(user.id, id, body);
  }

  @Delete('subjects/:id')
  deleteSubject(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.studyService.deleteSubject(user.id, id);
  }

  /** Dizi döner; 1000'den fazlaysa kesilir ve X-Truncated: true başlığı eklenir. */
  @Get('sessions')
  async listSessions(
    @CurrentUser() user: User,
    @Query() query: SessionsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessions, truncated } = await this.studyService.listSessions(user.id, query.from, query.to);
    if (truncated) res.setHeader('X-Truncated', 'true');
    return sessions;
  }
}
