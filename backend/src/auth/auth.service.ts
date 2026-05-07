import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async login(email: string, pass: string) {
    const user = await this.usersService.login(email, pass);
    if (!user) {
      throw new UnauthorizedException('Hatalı e-posta veya şifre girdiniz.');
    }
    const payload = { email: user.email, sub: user.id };
    return {
      success: true,
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(body: any) {
    const user = await this.usersService.create(body);
    const payload = { email: user.email, sub: user.id };
    return {
      success: true,
      user,
      access_token: this.jwtService.sign(payload),
    };
  }
}
