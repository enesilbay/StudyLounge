import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto, UpdateTaskDto } from './dto/study.dto';
import { StudyService } from './study.service';
import { Task } from './task.entity';

const MAX_OPEN_TASKS = 200;

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    private readonly studyService: StudyService,
  ) {}

  /** Açık görevler önce ("bu turda" olanlar en üstte), ardından son 7 günde bitenler. */
  async list(userId: number) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.tasks
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.subject', 'subject')
      .where('task.userId = :userId', { userId })
      .andWhere('(task.done = false OR task.doneAt >= :weekAgo)', { weekAgo })
      .orderBy('task.done', 'ASC')
      .addOrderBy('task.current', 'DESC')
      .addOrderBy('task.createdAt', 'ASC')
      .getMany();
  }

  async create(userId: number, dto: CreateTaskDto) {
    const open = await this.tasks.count({ where: { user: { id: userId }, done: false } });
    if (open >= MAX_OPEN_TASKS) {
      throw new BadRequestException('Çok fazla açık görevin var. Bitenleri işaretle ya da sil.');
    }
    const subjectId = await this.studyService.resolveOwnedSubjectId(userId, dto.subjectId);
    const saved = await this.tasks.save(
      this.tasks.create({
        user: { id: userId },
        title: dto.title,
        current: dto.current ?? false,
        subject: subjectId ? { id: subjectId } : null,
      }),
    );
    return this.findOwned(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateTaskDto) {
    const task = await this.findOwned(userId, id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.current !== undefined) task.current = dto.current;
    if (dto.done !== undefined && dto.done !== task.done) {
      task.done = dto.done;
      task.doneAt = dto.done ? new Date() : null;
      // Biten görev "bu turda" listesinden düşer.
      if (dto.done) task.current = false;
    }
    if (dto.subjectId !== undefined) {
      const subjectId = await this.studyService.resolveOwnedSubjectId(userId, dto.subjectId);
      task.subject = subjectId ? ({ id: subjectId } as Task['subject']) : null;
    }
    await this.tasks.save(task);
    return this.findOwned(userId, id);
  }

  async remove(userId: number, id: number) {
    const task = await this.findOwned(userId, id);
    await this.tasks.remove(task);
    return { success: true };
  }

  private async findOwned(userId: number, id: number) {
    const task = await this.tasks.findOne({ where: { id, user: { id: userId } }, relations: { subject: true } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    return task;
  }
}
