import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto/study.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.tasksService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() body: CreateTaskDto) {
    return this.tasksService.create(user.id, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateTaskDto) {
    return this.tasksService.update(user.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(user.id, id);
  }
}
