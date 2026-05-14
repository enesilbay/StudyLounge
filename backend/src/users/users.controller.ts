import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RespondRequestDto } from './dto/respond-request.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { User } from './user.entity';
import { UsersService } from './users.service';
import type { Express } from 'express';
import { NotificationsService } from '../notifications/notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('leaderboard')
  async getLeaderboard() {
    return this.usersService.getLeaderboard();
  }

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    const currentUser = await this.usersService.findById(user.id);
    return { success: true, user: currentUser };
  }

  @Post('friend-request')
  async sendRequest(
    @CurrentUser() user: User,
    @Body() body: SendFriendRequestDto,
  ) {
    const request = await this.usersService.sendFriendRequest(
      user.id,
      body.receiverUsername,
    );

    return {
      success: true,
      message: 'Arkadaslik istegi basariyla gonderildi.',
      data: request,
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

    return {
      success: true,
      message: `Istek ${body.status === 'accepted' ? 'kabul edildi' : 'reddedildi'}.`,
      data: result,
    };
  }

  @Get('friends/:userId')
  async getFriends(@CurrentUser() user: User) {
    return this.usersService.getFriends(user.id);
  }

  @Post('avatar/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const userId = (req.user as User | undefined)?.id ?? 'unknown';
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
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const avatarUrl = `/uploads/${file.filename}`;
    const updatedUser = await this.usersService.updateAvatar(
      user.id,
      avatarUrl,
    );
    return { success: true, user: updatedUser };
  }

  @Post('demo/upgrade')
  async demoUpgradeToPremium(@CurrentUser() user: User) {
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
    const updatedUser = await this.usersService.updateAccountSettings(
      user.id,
      body,
    );
    return {
      success: true,
      user: updatedUser,
      access_token: this.jwtService.sign({
        sub: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
      }),
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

  @Post('nudge/:id')
  async nudgeFriend(@CurrentUser() user: User, @Param('id') targetId: string) {
    const sender = await this.usersService.findById(user.id);
    const tokens = await this.usersService.getUserPushTokens([Number(targetId)]);
    tokens.forEach((token) => {
      void this.notificationsService.sendNotification(
        token,
        'StudyLounge',
        `${sender?.fullName} seni çalışmaya davet ediyor!`
      );
    });
    return { success: true, message: 'Dürtme gönderildi!' };
  }

  // ── AŞAMA 3: MAĞAZA ENDPOINTLERİ ──
  @Post('buy')
  async buyItem(
    @CurrentUser() user: User,
    @Body() body: { itemType: 'color' | 'icon'; itemId: string; price: number }
  ) {
    const updatedUser = await this.usersService.buyItem(user.id, body.itemType, body.itemId, body.price);
    return { success: true, user: updatedUser };
  }

  @Post('equip')
  async equipItem(
    @CurrentUser() user: User,
    @Body() body: { itemType: 'color' | 'icon'; itemId: string }
  ) {
    const updatedUser = await this.usersService.equipItem(user.id, body.itemType, body.itemId);
    return { success: true, user: updatedUser };
  }
}
