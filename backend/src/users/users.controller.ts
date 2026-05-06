import { Controller, Post, Body, Get, Param, BadRequestException, UnauthorizedException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── 1. KAYIT OL ──
  @Post('register')
  async register(@Body() body: any) {
    if (!body.username || !body.email || !body.password || !body.fullName) {
      throw new BadRequestException('Kullanıcı adı, Ad Soyad, E-posta ve Şifre zorunludur!');
    }
    return this.usersService.create(body);
  }

  // ── 2. GİRİŞ YAP ──
  @Post('login')
  async login(@Body() body: any) {
    const user = await this.usersService.login(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Hatalı e-posta veya şifre girdiniz.');
    }
    return { success: true, user };
  }

  // ── 3. LİDERLİK TABLOSUNU GETİR ──
  @Get('leaderboard')
  async getLeaderboard() {
    return this.usersService.getLeaderboard();
  }

  // ── 4. ARKADAŞLIK İSTEĞİ GÖNDER ──
  @Post('friend-request')
  async sendRequest(@Body() body: { senderId: number; receiverUsername: string }) {
    if (!body.senderId || !body.receiverUsername) {
      throw new BadRequestException('Gönderen ID ve Alıcı Kullanıcı Adı eksik.');
    }
    const request = await this.usersService.sendFriendRequest(body.senderId, body.receiverUsername);
    return { success: true, message: 'Arkadaşlık isteği başarıyla gönderildi!', data: request };
  }

  // ── 5. BANA GELEN İSTEKLERİ GÖR ──
  @Get('friend-requests/:userId')
  async getRequests(@Param('userId') userId: string) {
    return this.usersService.getPendingRequests(Number(userId));
  }

  // ── 6. İSTEĞİ YANITLA (Kabul/Red) ──
  @Post('respond-request')
  async respondRequest(@Body() body: { requestId: number; receiverId: number; status: 'accepted' | 'rejected' }) {
    if (!body.requestId || !body.receiverId || !body.status) {
      throw new BadRequestException('Eksik bilgi gönderildi.');
    }
    const result = await this.usersService.respondToRequest(body.requestId, body.receiverId, body.status);
    return { success: true, message: `İstek ${body.status === 'accepted' ? 'kabul edildi' : 'reddedildi'}.`, data: result };
  }

  // ── 7. ARKADAŞ LİSTEMİ GETİR ──
  @Get('friends/:userId')
  async getFriends(@Param('userId') userId: string) {
    return this.usersService.getFriends(Number(userId));
  }

  // ── 8. AVATAR YÜKLEME UCU (YENİ EKLENDİ) ──
  @Post('avatar/:id')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `avatar-${req.params.id}-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenemedi!');
    }
    const avatarUrl = `/uploads/${file.filename}`;
    const updatedUser = await this.usersService.updateAvatar(Number(id), avatarUrl);
    return { success: true, user: updatedUser };
  }

  // ── 9. PREMIUM ABONELİK (YENİ EKLENDİ) ──
  @Post('upgrade/:id')
  async upgradeToPremium(@Param('id') id: string) {
    const updatedUser = await this.usersService.upgradeToPremium(Number(id));
    return { success: true, message: 'Premium aktif edildi!', user: updatedUser };
  }
}