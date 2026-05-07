import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
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

  // Dosya (PDF/Not) Mesajını Kaydet
  async createFileMessage(roomName: string, userId: number, fileName: string, fileUrl: string) {
    const newMessage = this.messageRepository.create({
      text: fileName, // Görünecek metin olarak dosya adını kullanıyoruz
      roomName,
      fileUrl,
      type: 'file', // Tipi file olarak işaretliyoruz
      user: { id: userId },
    });
    return await this.messageRepository.save(newMessage);
  }

  // Odaya ait son 50 mesajı getir (İlişkili kullanıcı verisiyle beraber)
  async getRoomMessages(roomName: string) {
    return await this.messageRepository.find({
      where: { roomName },
      order: { createdAt: 'ASC' },
      take: 50,
      relations: ['user'], 
    });
  }
}