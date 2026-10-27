import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { Feedback } from './feedback.entity';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let manager: { findOne: jest.Mock; update: jest.Mock };
  let repo: { manager: { transaction: jest.Mock }; findAndCount: jest.Mock };
  let audit: { record: jest.Mock };
  let service: FeedbackService;

  beforeEach(() => {
    manager = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    repo = {
      manager: { transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)) },
      findAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 61]),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new FeedbackService(
      repo as unknown as Repository<Feedback>,
      audit as unknown as AdminAuditService,
    );
  });

  it('listeyi her zaman { items, total, page, pageSize } biciminde sayfalar', async () => {
    const result = await service.list('open', 3, 25);

    expect(result).toEqual({ items: [{ id: 1 }], total: 61, page: 3, pageSize: 25 });
    expect(repo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ take: 25, skip: 50 }));
  });

  it('sayfa boyutunu 100 ile sinirlar', async () => {
    const result = await service.list('all', 1, 5000);
    expect(result.pageSize).toBe(100);
  });

  it('durum degisikligini ayni transaction icinde denetim kaydina yazar', async () => {
    manager.findOne.mockResolvedValue({ id: 5, status: 'open', user: { id: 9, username: 'ada' } });

    await service.setStatus(1, 5, 'done');

    expect(manager.update).toHaveBeenCalledWith(Feedback, 5, { status: 'done' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 1,
        targetId: 9,
        action: 'feedback_done',
        details: { feedbackId: 5, from: 'open', to: 'done' },
      }),
      manager,
    );
  });

  it('yeniden acma feedback_reopen olarak kaydedilir', async () => {
    manager.findOne.mockResolvedValue({ id: 5, status: 'done', user: { id: 9, username: 'ada' } });

    await service.setStatus(1, 5, 'open');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'feedback_reopen' }),
      manager,
    );
  });

  it('durum zaten aynıysa kayit yazilmaz; bulunamayan geri bildirim 404 verir', async () => {
    manager.findOne.mockResolvedValue({ id: 5, status: 'done', user: null });
    await service.setStatus(1, 5, 'done');
    expect(audit.record).not.toHaveBeenCalled();

    manager.findOne.mockResolvedValue(null);
    await expect(service.setStatus(1, 6, 'done')).rejects.toThrow(NotFoundException);
  });
});
