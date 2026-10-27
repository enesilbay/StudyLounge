import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository, MoreThan } from 'typeorm';
import { Message } from './message.entity';
import { DirectMessage } from './direct-message.entity';
import { User } from '../users/user.entity';

/** Mesajlarda yazar için istemcinin kullandığı alanlar; e-posta, coin vb. dışarı çıkmaz. */
function publicAuthor(user: User | null | undefined) {
  if (!user) return null;
  const { id, username, fullName, avatarUrl, equippedProfileFrame, equippedBubbleColor, equippedIcon, isPremium } = user;
  return { id, username, fullName, avatarUrl, equippedProfileFrame, equippedBubbleColor, equippedIcon, isPremium } as User;
}

/** DM geçmişinde bir seferde dönen mesaj sayısı. */
export const DM_PAGE_SIZE = 100;

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(DirectMessage)
    private readonly dmRepository: Repository<DirectMessage>,
  ) {}

  // Normal Metin Mesajını Kaydet
  async createMessage(text: string, roomName: string, userId: number) {
    const newMessage = this.messageRepository.create({
      text,
      roomName,
      type: 'text', // Varsayılan metin
      user: { id: userId },
    });
    return await this.messageRepository.save(newMessage);
  }

  // Dosya (PDF/Not/Görsel) Mesajını Kaydet
  async createFileMessage(
    roomName: string,
    userId: number,
    fileName: string,
    fileUrl: string,
    type: string = 'file',
  ) {
    const newMessage = this.messageRepository.create({
      text: fileName, // Görünecek metin olarak dosya adını kullanıyoruz
      roomName,
      fileUrl,
      type, // Tipi parametreden gelen file veya image olarak işaretliyoruz
      user: { id: userId },
    });
    return await this.messageRepository.save(newMessage);
  }

  /**
   * Kullanıcının bu odaya son 10 dakikada yüklediği, fileUrl'i eşleşen dosya mesajı.
   * Yükleme ucu her dosya için `message` tablosuna kayıt yazdığı için oradan bakılır.
   */
  async findOwnFileMessage(userId: number, roomName: string, fileUrl: string): Promise<Message | null> {
    return await this.messageRepository.findOne({
      where: {
        user: { id: userId },
        roomName,
        fileUrl,
        createdAt: MoreThan(new Date(Date.now() - 10 * 60 * 1000)),
      },
      order: { id: 'DESC' },
    });
  }

  // Odaya ait son 50 mesajı getir (İlişkili kullanıcı verisiyle beraber)
  async getRoomMessages(roomName: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const messages = await this.messageRepository.find({
      where: { roomName, createdAt: MoreThan(oneHourAgo) },
      order: { createdAt: 'ASC' },
      take: 50,
      relations: ['user'],
    });
    return messages.map((message) => ({ ...message, user: publicAuthor(message.user) }));
  }

  // ── DM METODLARI ──
  /**
   * Sohbetin en yeni DM_PAGE_SIZE mesajı, eskiden yeniye sıralı. `before`: bu mesaj
   * id'sinden önceki (daha eski) mesajları getirir.
   */
  async getDirectMessages(userId1: number, userId2: number, before?: number) {
    const idFilter = before !== undefined ? { id: LessThan(before) } : {};
    const messages = await this.dmRepository.find({
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 }, ...idFilter },
        { sender: { id: userId2 }, receiver: { id: userId1 }, ...idFilter },
      ],
      order: { id: 'DESC' },
      take: DM_PAGE_SIZE,
    });
    return messages
      .reverse()
      .map((message) => ({ ...message, sender: publicAuthor(message.sender), receiver: publicAuthor(message.receiver) }));
  }

  async createDirectMessage(senderId: number, receiverId: number, text: string, type: string = 'text', fileUrl?: string) {
    const dm = this.dmRepository.create({
      sender: { id: senderId },
      receiver: { id: receiverId },
      text,
      type,
      fileUrl,
    });
    return await this.dmRepository.save(dm);
  }

  async getUnreadSenders(userId: number) {
    // Tekilleştirme veritabanında: yalnızca farklı gönderen id'leri çekilir.
    const rows = await this.dmRepository
      .createQueryBuilder('dm')
      .select('DISTINCT dm."senderId"', 'senderId')
      .where('dm."receiverId" = :userId', { userId })
      .andWhere('dm."isRead" = false')
      .getRawMany<{ senderId: number }>();
    if (rows.length === 0) return [];
    const senders = await this.dmRepository.manager.find(User, {
      where: { id: In(rows.map((row) => Number(row.senderId))) },
    });
    return senders.map((sender) => publicAuthor(sender));
  }

  async markAsRead(senderId: number, receiverId: number) {
    await this.dmRepository.update(
      { sender: { id: senderId }, receiver: { id: receiverId }, isRead: false },
      { isRead: true },
    );
  }
}
