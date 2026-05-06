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

  // Mesajı Kaydet
  async createMessage(text: string, roomName: string, userId: number) {
    const newMessage = this.messageRepository.create({
      text,
      roomName,
      user: { id: userId }, // ManyToOne ilişkisi için ID yeterli
    });
    return await this.messageRepository.save(newMessage);
  }

  // Odaya ait son 50 mesajı getir
  async getRoomMessages(roomName: string) {
    return await this.messageRepository.find({
      where: { roomName },
      order: { createdAt: 'ASC' },
      take: 50,
      relations: ['user'], // Mesajı atan kullanıcının bilgilerini de çekiyoruz
    });
  }
}