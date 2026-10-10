import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from '../users/user.entity';
import { AdminAction, AdminActionType } from './admin-action.entity';

export interface RecordActionInput {
  adminId: number;
  targetId?: number | null;
  targetLabel?: string | null;
  action: AdminActionType;
  reason?: string | null;
  details?: Record<string, unknown> | null;
}

export interface ActionsQuery {
  action?: AdminActionType;
  targetId?: number;
  page?: number;
  pageSize?: number;
}

/** Yönetici işlemlerini kaydeder ve listeler. */
@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAction)
    private readonly actions: Repository<AdminAction>,
  ) {}

  /** İşlemle aynı transaction içinde yazmak için `manager` verilebilir. */
  async record(
    input: RecordActionInput,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(AdminAction) : this.actions;
    const adminId = Math.trunc(Number(input.adminId));
    await repo.insert({
      admin: { id: adminId } as User,
      // Yöneticinin o anki kullanıcı adı aynı INSERT içinde okunur (adminId oturumdan gelen tam sayıdır).
      adminLabel: () =>
        `(SELECT "username" FROM "users" WHERE "id" = ${adminId})`,
      target: input.targetId ? ({ id: input.targetId } as User) : null,
      targetLabel: input.targetLabel ?? null,
      action: input.action,
      reason: input.reason?.trim() || null,
      details: (input.details ??
        null) as QueryDeepPartialEntity<AdminAction>['details'],
    });
  }

  async list(query: ActionsQuery) {
    const pageSize = Math.min(query.pageSize ?? 50, 100);
    const page = Math.max(query.page ?? 1, 1);
    const [items, total] = await this.actions.findAndCount({
      where: {
        ...(query.action ? { action: query.action } : {}),
        ...(query.targetId ? { target: { id: query.targetId } } : {}),
      },
      relations: { admin: true, target: true },
      select: {
        id: true,
        action: true,
        reason: true,
        details: true,
        adminLabel: true,
        targetLabel: true,
        createdAt: true,
        admin: { id: true, username: true, fullName: true },
        target: { id: true, username: true, fullName: true },
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });
    return { items, total, page, pageSize };
  }
}
