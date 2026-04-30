import { Controller, Post, Body, Get, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() userData: Partial<User>): Promise<User> {
    try {
      return await this.usersService.create(userData);
    } catch (error: any) {
      // Servisten gelen hataları (Örn: Email zaten var) mobil uygulamaya düzgün ilet
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    // TypeScript onayı: Eğer mobilden şifre gelmezse direkt reddet
    if (!body.password) {
      throw new HttpException('Şifre alanı gereklidir.', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersService.login(body.email, body.password);
    if (!user) {
      throw new HttpException('E-posta veya şifre hatalı.', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('leaderboard')
  async getLeaderboard() {
    return this.usersService.getLeaderboard();
  }

}