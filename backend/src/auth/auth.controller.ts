import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      username: string;
      email: string;
      password?: string;
      fullName: string;
    },
  ) {
    if (!body.username || !body.email || !body.password || !body.fullName) {
      throw new BadRequestException(
        'Kullanıcı adı, Ad Soyad, E-posta ve Şifre zorunludur!',
      );
    }
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('E-posta ve şifre zorunludur!');
    }
    return this.authService.login(body.email, body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException('E-posta adresi zorunludur!');
    }
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { email: string; token: string; newPass: string },
  ) {
    if (!body.email || !body.token || !body.newPass) {
      throw new BadRequestException('Tüm alanlar zorunludur!');
    }
    return this.authService.resetPassword(body.email, body.token, body.newPass);
  }
}
