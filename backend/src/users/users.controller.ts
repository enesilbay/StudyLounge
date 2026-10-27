import {
  Body,
  Controller,
  Delete,
  BadRequestException,
  ForbiddenException,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getConfigBoolean } from '../config/env';
import { LimitedFileInterceptor } from '../common/upload-interceptor';
import { memoryStorage } from 'multer';
import { StorageService } from '../storage/storage.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { createUploadFileFilter } from '../common/upload-filter';
import { AVATAR_UPLOAD_TYPES, hasImageSignature } from './avatar-upload';
import { buildJwtPayload } from '../auth/jwt-payload.interface';
import { MailService } from '../mail/mail.service';
import { RealtimeService } from '../realtime/realtime.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { AvatarCharacterDto } from './dto/avatar-character.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { ShopItemDto } from './dto/shop-item.dto';
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { characterAvatarPath } from './avatar-characters';
import { User } from './user.entity';
import { UsersService } from './users.service';
import type { Express } from 'express';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly moderationService: ModerationService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get('leaderboard')
  async getLeaderboard() {
    return this.usersService.getLeaderboard();
  }

  @Get('friends-leaderboard')
  async getFriendsLeaderboard(@CurrentUser() user: User) {
    return this.usersService.getFriendsLeaderboard(user.id);
  }

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    const currentUser = await this.usersService.findById(user.id);
    const hasPassword = await this.usersService.hasPassword(user.id);
    return {
      success: true,
      user: currentUser ? Object.assign(currentUser, { hasPassword }) : currentUser,
    };
  }

  /** Hesabi kalici olarak siler (kullanici adi + varsa sifre ile onaylanir). */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Delete('me')
  async deleteMe(@CurrentUser() user: User, @Body() body: DeleteAccountDto) {
    await this.usersService.deleteAccount(
      user.id,
      body.confirmation,
      body.password,
    );
    await this.storageService.removeByUrl(user.avatarUrl);
    // Açık sekmeler kapanır; token'ı olan biri soketle bağlanamaz (kullanıcı artık yok).
    this.realtime.disconnectUser(user.id);
    return { success: true, message: 'Hesabın ve verilerin silindi.' };
  }

  @Post('friend-request')
  async sendRequest(
    @CurrentUser() user: User,
    @Body() body: SendFriendRequestDto,
  ) {
    const receiverId = await this.usersService.findIdByUsername(body.receiverUsername);
    if (receiverId) {
      await this.moderationService.assertNotBlocked(user.id, receiverId, 'Bu kullanıcıya istek gönderemezsin.');
    }
    const request = await this.usersService.sendFriendRequest(
      user.id,
      body.receiverUsername,
    );

    // Alıcının açık sekmelerine anında haber ver (eski istemciler olayı yok sayar).
    this.realtime.emitToUser(request.receiver.id, 'friend_request', {
      fromUserId: user.id,
      fromUsername: user.username,
    });

    return {
      success: true,
      message: 'Arkadaşlık isteği başarıyla gönderildi.',
      // Yalnızca kimlik ve durum; iki kullanıcının tüm alanları yanıta girmesin.
      data: { id: request.id, status: request.status },
    };
  }

  @Get('friend-requests/:userId')
  async getRequests(@CurrentUser() user: User) {
    return this.usersService.getPendingRequests(user.id);
  }

  @Post('respond-request')
  async respondRequest(
    @CurrentUser() user: User,
    @Body() body: RespondRequestDto,
  ) {
    const result = await this.usersService.respondToRequest(
      body.requestId,
      user.id,
      body.status,
    );

    if (result.status === 'accepted') {
      this.realtime.emitToUser(result.sender.id, 'friend_accepted', {
        userId: user.id,
        username: user.username,
      });
    }

    return {
      success: true,
      message: `İstek ${body.status === 'accepted' ? 'kabul edildi' : 'reddedildi'}.`,
      data: { id: result.id, status: result.status },
    };
  }

  @Get('friends/:userId')
  async getFriends(@CurrentUser() user: User) {
    return this.usersService.getFriends(user.id);
  }

  /** Arkadaşlıktan çıkarır (iki yönlü). */
  @Delete('friends/:id')
  async removeFriend(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) friendId: number,
  ) {
    await this.usersService.removeFriend(user.id, friendId);
    return { success: true, message: 'Arkadaşlıktan çıkarıldı.' };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('avatar/:id')
  @UseInterceptors(
    LimitedFileInterceptor('file', {
      // Dosya once bellekte tutulur, dogrulamadan sonra depoya yazilir.
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      // Uzantı + MIME listesi (SVG/HEIC yok); içerik imzası aşağıda ayrıca doğrulanır.
      fileFilter: createUploadFileFilter(AVATAR_UPLOAD_TYPES),
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Uzantı ve MIME istemciden gelir; dosyanın gerçek içeriği beyan edilen türle uyuşmalı.
    if (!hasImageSignature(file.buffer, file.originalname)) {
      throw new BadRequestException(
        'Geçerli bir resim yükle (PNG, JPG, WEBP veya GIF).',
      );
    }
    this.storageService.reserveUploadQuota(user.id, file.size);
    const avatarUrl = await this.storageService.put(
      this.storageService.createKey(`avatar-${user.id}`, file.originalname),
      file.buffer,
    );
    const updatedUser = await this.usersService.updateAvatar(
      user.id,
      avatarUrl,
    );
    // Eski avatar artik kullanilmiyor.
    if (user.avatarUrl && user.avatarUrl !== avatarUrl) {
      await this.storageService.removeByUrl(user.avatarUrl);
    }
    return { success: true, user: updatedUser };
  }

  /** Hazir karakterlerden birini profil fotografi yapar; yuklenmis fotograf varsa silinir. */
  @Put('me/avatar-character')
  async setAvatarCharacter(
    @CurrentUser() user: User,
    @Body() body: AvatarCharacterDto,
  ) {
    const updatedUser = await this.usersService.updateAvatar(
      user.id,
      characterAvatarPath(body.character),
    );
    await this.storageService.removeByUrl(user.avatarUrl);
    return { success: true, user: updatedUser };
  }

  // Odeme akisi yokken gelistirme icin Premium verir. Yalnizca ALLOW_DEMO_PREMIUM=true
  // olan ortamlarda acik; canli ortamda tanimli olmadigi icin kendiliginden kapalidir.
  @Post('demo/upgrade')
  async demoUpgradeToPremium(@CurrentUser() user: User) {
    if (!getConfigBoolean(this.configService, 'ALLOW_DEMO_PREMIUM', false)) {
      throw new ForbiddenException(
        'Demo Premium bu ortamda kapalı. Premium, ödeme sistemi açıldığında satın alınabilecek.',
      );
    }
    const updatedUser = await this.usersService.upgradeToPremium(user.id);
    return {
      success: true,
      message: 'Demo premium aktif edildi.',
      user: updatedUser,
    };
  }

  @Put('me/settings')
  async updateAccountSettings(
    @CurrentUser() user: User,
    @Body() body: UpdateAccountSettingsDto,
  ) {
    const result = await this.usersService.updateAccountSettings(
      user.id,
      body,
    );
    if (result.emailChanged && result.verificationCode) {
      // Gönderilemezse kullanıcı giriş ekranında "Kodu tekrar gönder" ile yeni kod alabilir.
      await this.mailService.sendVerificationEmail(
        result.user.email,
        result.verificationCode,
      );
    }
    if (result.passwordChanged) {
      // Diğer cihazlardaki soketler kapanır; bu istemci yanıttaki yeni token ile bağlanır.
      this.realtime.disconnectUser(user.id);
    }
    return {
      success: true,
      user: result.user,
      access_token: this.jwtService.sign(buildJwtPayload(result.user)),
      emailVerificationRequired: result.emailChanged,
    };
  }

  @Put(':id/profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() body: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(
      user.id,
      body.fullName,
    );
    return { success: true, user: updated };
  }

  @Get('analytics/:id')
  async getAnalytics(@CurrentUser() user: User) {
    return this.usersService.getWeeklyAnalytics(user.id);
  }

  @Put(':id/push-token')
  async updatePushToken(
    @CurrentUser() user: User,
    @Body() body: UpdatePushTokenDto,
  ) {
    const updatedUser = await this.usersService.updatePushToken(
      user.id,
      body.token,
    );
    return { success: true, user: updatedUser };
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('nudge/:id')
  async nudgeFriend(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) targetId: number,
  ) {
    if (!(await this.usersService.areFriends(user.id, targetId))) {
      throw new ForbiddenException('Yalnızca arkadaşlarını dürtebilirsin.');
    }
    await this.moderationService.assertNotBlocked(user.id, targetId);
    const sender = await this.usersService.findById(user.id);
    const tokens = await this.usersService.getUserPushTokens([targetId]);
    tokens.forEach((token) => {
      void this.notificationsService.sendNotification(
        token,
        'StudyLounge',
        `${sender?.fullName} seni çalışmaya davet ediyor!`
      );
    });
    return { success: true, message: 'Dürtme gönderildi!' };
  }

  @Get('search')
  async search(@CurrentUser() user: User, @Query('q') query = '') {
    const blocked = await this.moderationService.blockedIdsFor(user.id);
    return this.usersService.searchUsers(query, [user.id, ...blocked]);
  }

  @Get('badges/catalog')
  getBadgeCatalog() {
    return this.usersService.getBadgeCatalog();
  }

  // ── AŞAMA 3: MAĞAZA ENDPOINTLERİ ──
  @Get('shop/catalog')
  getShopCatalog() {
    return this.usersService.getShopCatalog();
  }

  @Post('buy')
  async buyItem(@CurrentUser() user: User, @Body() body: ShopItemDto) {
    const updatedUser = await this.usersService.buyItem(user.id, body.itemType, body.itemId);
    return { success: true, user: updatedUser };
  }

  @Post('equip')
  async equipItem(@CurrentUser() user: User, @Body() body: ShopItemDto) {
    const updatedUser = await this.usersService.equipItem(user.id, body.itemType, body.itemId);
    return { success: true, user: updatedUser };
  }

  /**
   * Herkese açık profil. Beni engellemiş birinin profili görünmez; benim engellediğimde
   * engeli kaldırabileyim diye görünür. Bulunduğu oda yalnızca arkadaşlara gösterilir.
   */
  @Get(':id/public')
  async getPublicProfile(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    const profile = await this.usersService.getPublicProfile(id);
    // isBlockedBy(engellenen, engelleyen)
    const theyBlockedMe = await this.moderationService.isBlockedBy(user.id, id);
    if (!profile || theyBlockedMe) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    const blockedByMe = await this.moderationService.isBlockedBy(id, user.id);
    const friendship = id === user.id ? { status: 'self' as const, requestId: null } : await this.usersService.friendshipStatus(user.id, id);
    const canSeeRoom = friendship.status === 'friends' || friendship.status === 'self';
    return { ...profile, currentRoom: canSeeRoom ? profile.currentRoom : null, friendship, blockedByMe };
  }
}
