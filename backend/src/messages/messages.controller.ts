import { 
  Controller, Post, Get, Body, Param, 
  UseInterceptors, UploadedFile, UseGuards 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // 1. Normal Metin Mesajı Gönderme
  @Post()
  async send(@Body() body: { text: string; roomName: string; userId: number }) {
    return await this.messagesService.createMessage(body.text, body.roomName, body.userId);
  }

  // 2. PDF / Dosya Yükleme ve Kaydetme
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads', // Kök dizindeki uploads klasörü
      filename: (req, file, cb) => {
        // Çakışma olmaması için: "171509-456789.pdf" gibi benzersiz isim üretir
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    const fileUrl = `/uploads/${file.filename}`;
    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'file';
    
    // Veritabanına dosya tipiyle kaydet
    return await this.messagesService.createFileMessage(
      body.roomName,
      Number(body.userId),
      file.originalname,
      fileUrl,
      fileType
    );
  }

  // 3. Odaya Ait Geçmiş Mesajları Getirme
  @Get(':roomName')
  async getMessages(@Param('roomName') roomName: string) {
    return await this.messagesService.getRoomMessages(roomName);
  }
}