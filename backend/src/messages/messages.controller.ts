import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async send(@Body() body: { text: string; roomName: string; userId: number }) {
    return await this.messagesService.createMessage(body.text, body.roomName, body.userId);
  }

  @Get(':roomName')
  async getMessages(@Param('roomName') roomName: string) {
    return await this.messagesService.getRoomMessages(roomName);
  }
}