import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateSubjectDto, SessionsQueryDto, SummaryQueryDto, UpdateGoalsDto, UpdateSubjectDto } from './dto/study.dto';
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

  @Get('sessions')
  listSessions(@CurrentUser() user: User, @Query() query: SessionsQueryDto) {
    return this.studyService.listSessions(user.id, query.from, query.to);
  }

  @Get('summary')
  summary(@CurrentUser() user: User, @Query() query: SummaryQueryDto) {
    return this.studyService.summary(user.id, query.days ?? 30);
  }

  @Get('goals')
  goals(@CurrentUser() user: User) {
    return this.studyService.getGoalProgress(user.id);
  }

  @Put('goals')
  updateGoals(@CurrentUser() user: User, @Body() body: UpdateGoalsDto) {
    return this.studyService.updateGoals(user.id, body);
  }
}
