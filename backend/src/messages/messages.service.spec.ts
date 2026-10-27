import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DirectMessage } from './direct-message.entity';
import { Message } from './message.entity';
import { DM_PAGE_SIZE, MessagesService } from './messages.service';

describe('MessagesService DM', () => {
  let service: MessagesService;
  const messageRepository = { findOne: jest.fn() };
  let dmRepository: { find: jest.Mock; createQueryBuilder: jest.Mock; manager: { find: jest.Mock } };

  beforeEach(async () => {
    dmRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: { find: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: messageRepository },
        { provide: getRepositoryToken(DirectMessage), useValue: dmRepository },
      ],
    }).compile();
    service = module.get(MessagesService);
  });

  it('en yeni 100 mesajı sorgular ve eskiden yeniye çevirir', async () => {
    // Veritabanı en yeniden eskiye döner.
    dmRepository.find.mockResolvedValue([
      { id: 30, sender: { id: 1 }, receiver: { id: 2 } },
      { id: 20, sender: { id: 2 }, receiver: { id: 1 } },
      { id: 10, sender: { id: 1 }, receiver: { id: 2 } },
    ]);

    const result = await service.getDirectMessages(1, 2);

    const [query] = dmRepository.find.mock.calls[0] as [{ order: unknown; take: number }];
    expect(query.order).toEqual({ id: 'DESC' });
    expect(query.take).toBe(DM_PAGE_SIZE);
    expect(result.map((message) => message.id)).toEqual([10, 20, 30]);
  });

  it('before verilince yalnızca o id den eski mesajları ister', async () => {
    dmRepository.find.mockResolvedValue([]);

    await service.getDirectMessages(1, 2, 50);

    const [query] = dmRepository.find.mock.calls[0] as [{ where: Array<{ id?: unknown }> }];
    expect(query.where).toHaveLength(2);
    expect(query.where.every((branch) => branch.id !== undefined)).toBe(true);
  });

  it('okunmamış göndericileri DISTINCT sorguyla getirir', async () => {
    const getRawMany = jest.fn().mockResolvedValue([{ senderId: 5 }, { senderId: 6 }]);
    const select = jest.fn().mockReturnThis();
    dmRepository.createQueryBuilder.mockReturnValue({
      select,
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany,
    });
    dmRepository.manager.find.mockResolvedValue([
      { id: 5, username: 'a', email: 'gizli@x.com' },
      { id: 6, username: 'b' },
    ]);

    const senders = await service.getUnreadSenders(1);

    expect(select).toHaveBeenCalledWith('DISTINCT dm."senderId"', 'senderId');
    expect(senders.map((sender) => sender?.id)).toEqual([5, 6]);
    expect(senders[0]).not.toHaveProperty('email');
  });

  it('okunmamış mesaj yoksa kullanıcı sorgusu yapmaz', async () => {
    dmRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    await expect(service.getUnreadSenders(1)).resolves.toEqual([]);
    expect(dmRepository.manager.find).not.toHaveBeenCalled();
  });

  it('findOwnFileMessage kullanıcı, oda, fileUrl ve son 10 dakikaya göre arar', async () => {
    messageRepository.findOne.mockResolvedValue({ id: 9 });

    const found = await service.findOwnFileMessage(4, 'Oda', '/uploads/file-1.pdf');

    expect(found).toEqual({ id: 9 });
    const [query] = messageRepository.findOne.mock.calls[0] as [
      { where: { user: { id: number }; roomName: string; fileUrl: string; createdAt: unknown } },
    ];
    expect(query.where).toMatchObject({ user: { id: 4 }, roomName: 'Oda', fileUrl: '/uploads/file-1.pdf' });
    expect(query.where.createdAt).toBeDefined();
  });
});
