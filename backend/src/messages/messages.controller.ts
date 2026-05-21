import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UploadMessageFileDto } from './dto/upload-message-file.dto';
import { MessagesService } from './messages.service';
import type { Express } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async send(@CurrentUser() user: User, @Body() body: CreateMessageDto) {
    return await this.messagesService.createMessage(
      body.text,
      body.roomName,
      user.id,
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadMessageFileDto,
  ) {
    const fileUrl = `/uploads/${file.filename}`;
    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'file';

    return await this.messagesService.createFileMessage(
      body.roomName,
      user.id,
      file.originalname,
      fileUrl,
      fileType,
    );
  }

  @Get('unread/dm-senders')
  async getUnreadSenders(@CurrentUser() user: User) {
    return await this.messagesService.getUnreadSenders(user.id);
  }

  @Get('dm/:userId')
  async getDirectMessages(
    @CurrentUser() user: User,
    @Param('userId') targetId: string,
  ) {
    await this.messagesService.markAsRead(Number(targetId), user.id);
    return await this.messagesService.getDirectMessages(user.id, Number(targetId));
  }

  @Post('dm/:userId')
  async sendDirectMessage(
    @CurrentUser() user: User,
    @Param('userId') targetId: string,
    @Body() body: CreateDirectMessageDto,
  ) {
    return await this.messagesService.createDirectMessage(
      user.id,
      Number(targetId),
      body.text,
    );
  }

  @Get(':roomName')
  async getMessages(@Param('roomName') roomName: string) {
    return await this.messagesService.getRoomMessages(roomName);
  }
}
