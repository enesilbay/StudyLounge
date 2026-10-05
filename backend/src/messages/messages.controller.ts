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
import { diskStorage } from 'multer';
import { unlink } from 'fs/promises';
import { extname } from 'path';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LobbiesService } from '../lobbies/lobbies.service';
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
  ) {}

  private async assertRoomAccess(roomName: string, userId: number) {
    if (!(await this.lobbiesService.canAccessRoom(roomName, userId))) {
      throw new ForbiddenException('Bu odanin sohbetine erisimin yok.');
    }
  }

  @Post()
  async send(@CurrentUser() user: User, @Body() body: CreateMessageDto) {
    await this.assertRoomAccess(body.roomName, user.id);
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
        fileSize: MAX_PDF_BYTES,
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PDF_BYTES }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadMessageFileDto,
  ) {
    if (!(await this.lobbiesService.canAccessRoom(body.roomName, user.id))) {
      await unlink(file.path).catch(() => undefined);
      throw new ForbiddenException('Bu odanin sohbetine erisimin yok.');
    }

    if (!isPdf(file) && file.size > MAX_FILE_BYTES) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException(
        "Dosya en fazla 5 MB olabilir. PDF'ler 20 MB'a kadar yüklenebilir.",
      );
    }

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
  async getMessages(@CurrentUser() user: User, @Param('roomName') roomName: string) {
    await this.assertRoomAccess(roomName, user.id);
    return await this.messagesService.getRoomMessages(roomName);
  }
}
