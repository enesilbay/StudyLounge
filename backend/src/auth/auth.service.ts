import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
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

  async register(body: Partial<User>) {
    const user = await this.usersService.create(body);
    const payload = { email: user.email, sub: user.id };
    return {
      success: true,
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  // ── 3. ŞİFREMİ UNUTTUM ──
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Güvenlik nedeniyle "e-posta bulunamadı" demek yerine genel bir mesaj dönmek daha iyidir
      // Ama geliştirme aşamasında hata fırlatabiliriz.
      return {
        success: true,
        message: 'Eğer hesap mevcutsa sıfırlama kodu gönderilecektir.',
      };
    }

    // 6 haneli rastgele kod üret
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // 1 saat geçerli

    await this.usersService.updateResetToken(user.id, token, expiry);
    await this.mailService.sendResetPasswordEmail(email, token);

    return {
      success: true,
      message: 'Şifre sıfırlama kodu e-posta adresinize gönderildi.',
    };
  }

  // ── 4. ŞİFREYİ SIFIRLA ──
  async resetPassword(email: string, token: string, newPass: string) {
    const user = await this.usersService.findByEmail(email);
    if (
      !user ||
      !user.resetPasswordToken ||
      user.resetPasswordToken !== token
    ) {
      throw new UnauthorizedException('Geçersiz veya hatalı kod.');
    }

    if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
      throw new UnauthorizedException('Sıfırlama kodunun süresi dolmuş.');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.usersService.updatePassword(user.id, hashed);

    return {
      success: true,
      message: 'Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.',
    };
  }
}
