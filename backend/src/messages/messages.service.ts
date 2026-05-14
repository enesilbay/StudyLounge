import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Message } from './message.entity';
import { DirectMessage } from './direct-message.entity';

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

  // Odaya ait son 50 mesajı getir (İlişkili kullanıcı verisiyle beraber)
  async getRoomMessages(roomName: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return await this.messageRepository.find({
      where: { roomName, createdAt: MoreThan(oneHourAgo) },
      order: { createdAt: 'ASC' },
      take: 50,
      relations: ['user'],
    });
  }

  // ── DM METODLARI ──
  async getDirectMessages(userId1: number, userId2: number) {
    return await this.dmRepository.find({
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 } },
        { sender: { id: userId2 }, receiver: { id: userId1 } },
      ],
      order: { createdAt: 'ASC' },
      take: 100,
    });
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
    const unreadMessages = await this.dmRepository.find({
      where: { receiver: { id: userId }, isRead: false },
      relations: ['sender'],
    });

    const sendersMap = new Map<number, any>();
    for (const msg of unreadMessages) {
      if (!sendersMap.has(msg.sender.id)) {
        sendersMap.set(msg.sender.id, msg.sender);
      }
    }
    return Array.from(sendersMap.values());
  }

  async markAsRead(senderId: number, receiverId: number) {
    await this.dmRepository.update(
      { sender: { id: senderId }, receiver: { id: receiverId }, isRead: false },
      { isRead: true },
    );
  }
}
