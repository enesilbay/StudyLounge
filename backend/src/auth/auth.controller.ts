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
}
