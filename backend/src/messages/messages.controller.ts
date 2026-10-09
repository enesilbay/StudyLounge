import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { StorageService } from '../storage/storage.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CHAT_UPLOAD_TYPES,
  createUploadFileFilter,
} from '../common/upload-filter';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LobbiesService } from '../lobbies/lobbies.service';
import { ModerationService } from '../moderation/moderation.service';
import { User } from '../users/user.entity';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UploadMessageFileDto } from './dto/upload-message-file.dto';
import { MessagesService } from './messages.service';
import type { Express } from 'express';

// Sohbet dosyalari 5 MB; ders notu PDF'leri (ortak tahta) 20 MB'a kadar.
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

function isPdf(file: Express.Multer.File) {
  return (
    file.mimetype === 'application/pdf' &&
    extname(file.originalname).toLowerCase() === '.pdf'
  );
}

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly lobbiesService: LobbiesService,
    private readonly moderationService: ModerationService,
    private readonly storageService: StorageService,
  ) {}

  private async assertRoomAccess(roomName: string, userId: number) {
    if (!(await this.lobbiesService.canAccessRoom(roomName, userId))) {
      throw new ForbiddenException('Bu odanin sohbetine erisimin yok.');
    }
  }

  @Post()
  async send(@CurrentUser() user: User, @Body() body: CreateMessageDto) {
    await this.assertRoomAccess(body.roomName, user.id);
    await this.moderationService.assertCanChat(user.id);
    return await this.messagesService.createMessage(
      body.text,
      body.roomName,
      user.id,
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      // Dosya once bellekte tutulur; kontrollerden gecerse depoya yazilir.
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_PDF_BYTES,
      },
      fileFilter: createUploadFileFilter(CHAT_UPLOAD_TYPES),
    }),
  )
  async uploadFile(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_PDF_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadMessageFileDto,
  ) {
    await this.assertRoomAccess(body.roomName, user.id);
    await this.moderationService.assertCanChat(user.id);

    if (!isPdf(file) && file.size > MAX_FILE_BYTES) {
      throw new BadRequestException(
        "Dosya en fazla 5 MB olabilir. PDF'ler 20 MB'a kadar yüklenebilir.",
      );
    }

    const fileUrl = await this.storageService.put(
      this.storageService.createKey('file', file.originalname),
      file.buffer,
    );
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
    return await this.messagesService.getDirectMessages(
      user.id,
      Number(targetId),
    );
  }

  // Web: sohbet acikken gelen mesajlar okundu sayilir.
  @Post('dm/:userId/read')
  async markDirectMessagesRead(
    @CurrentUser() user: User,
    @Param('userId') senderId: string,
  ) {
    await this.messagesService.markAsRead(Number(senderId), user.id);
    return { success: true };
  }

  @Post('dm/:userId')
  async sendDirectMessage(
    @CurrentUser() user: User,
    @Param('userId') targetId: string,
    @Body() body: CreateDirectMessageDto,
  ) {
    await this.moderationService.assertCanChat(user.id);
    await this.moderationService.assertNotBlocked(
      user.id,
      Number(targetId),
      'Bu kullanıcıya mesaj gönderemezsin.',
    );
    return await this.messagesService.createDirectMessage(
      user.id,
      Number(targetId),
      body.text,
    );
  }

  @Get(':roomName')
  async getMessages(
    @CurrentUser() user: User,
    @Param('roomName') roomName: string,
  ) {
    await this.assertRoomAccess(roomName, user.id);
    return await this.messagesService.getRoomMessages(roomName);
  }
}
