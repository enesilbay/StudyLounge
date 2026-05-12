import {
  Controller,
  Post,
  Put,
  Body,
  Get,
  Param,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Express } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Kayıt ve giriş işlemleri AuthController'a taşınmıştır.

  // ── 3. LİDERLİK TABLOSUNU GETİR ──
  @Get('leaderboard')
  async getLeaderboard() {
    return this.usersService.getLeaderboard();
  }

  // ── 4. ARKADAŞLIK İSTEĞİ GÖNDER ──
  @Post('friend-request')
  async sendRequest(
    @Body() body: { senderId: number; receiverUsername: string },
  ) {
    if (!body.senderId || !body.receiverUsername) {
      throw new BadRequestException(
        'Gönderen ID ve Alıcı Kullanıcı Adı eksik.',
      );
    }
    const request = await this.usersService.sendFriendRequest(
      body.senderId,
      body.receiverUsername,
    );
    return {
      success: true,
      message: 'Arkadaşlık isteği başarıyla gönderildi!',
      data: request,
    };
  }

  // ── 5. BANA GELEN İSTEKLERİ GÖR ──
  @Get('friend-requests/:userId')
  async getRequests(@Param('userId') userId: string) {
    return this.usersService.getPendingRequests(Number(userId));
  }

  // ── 6. İSTEĞİ YANITLA (Kabul/Red) ──
  @Post('respond-request')
  async respondRequest(
    @Body()
    body: {
      requestId: number;
      receiverId: number;
      status: 'accepted' | 'rejected';
    },
  ) {
    if (!body.requestId || !body.receiverId || !body.status) {
      throw new BadRequestException('Eksik bilgi gönderildi.');
    }
    const result = await this.usersService.respondToRequest(
      body.requestId,
      body.receiverId,
      body.status,
    );
    return {
      success: true,
      message: `İstek ${body.status === 'accepted' ? 'kabul edildi' : 'reddedildi'}.`,
      data: result,
    };
  }

  // ── 7. ARKADAŞ LİSTEMİ GETİR ──
  @Get('friends/:userId')
  async getFriends(@Param('userId') userId: string) {
    return this.usersService.getFriends(Number(userId));
  }

  // ── 8. AVATAR YÜKLEME UCU (YENİ EKLENDİ) ──
  @Post('avatar/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const userId = req.params.id as string;
          cb(
            null,
            `avatar-${userId}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenemedi!');
    }
    const avatarUrl = `/uploads/${file.filename}`;
    const updatedUser = await this.usersService.updateAvatar(
      Number(id),
      avatarUrl,
    );
    return { success: true, user: updatedUser };
  }

  // ── 9. PREMIUM ABONELİK ──
  @Post('upgrade/:id')
  async upgradeToPremium(@Param('id') id: string) {
    const updatedUser = await this.usersService.upgradeToPremium(Number(id));
    return {
      success: true,
      message: 'Premium aktif edildi!',
      user: updatedUser,
    };
  }

  // ── PROFİL BİLGİLERİ GÜNCELLEME ──
  @Put(':id/profile')
  async updateProfile(@Param('id') id: string, @Body() body: { fullName: string }) {
    if (!body.fullName || body.fullName.trim() === '') {
      throw new BadRequestException('İsim boş olamaz');
    }
    const updated = await this.usersService.updateProfile(Number(id), body.fullName);
    return { success: true, user: updated };
  }

  // ── 10. HAFTALIK ANALİTİK ──
  @Get('analytics/:id')
  async getAnalytics(@Param('id') id: string) {
    return this.usersService.getWeeklyAnalytics(Number(id));
  }

  // ── 11. PUSH TOKEN GÜNCELLEME ──
  @Put(':id/push-token')
  async updatePushToken(
    @Param('id') id: string,
    @Body() body: { token: string },
  ) {
    if (!body.token) {
      throw new BadRequestException('Token eksik.');
    }
    const updatedUser = await this.usersService.updatePushToken(
      Number(id),
      body.token,
    );
    return { success: true, user: updatedUser };
  }
}
