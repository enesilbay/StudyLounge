import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { JwtPayload } from './jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';

/** 6 haneli, kriptografik olarak rastgele dogrulama kodu. */
function generateCode(): string {
  return randomInt(100000, 1000000).toString();
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  private async rejectWrongCode(userId: number, attempts: number | undefined, message: string): Promise<never> {
    const locked = await this.usersService.registerFailedCodeAttempt(userId, attempts ?? 0);
    throw new UnauthorizedException(
      locked ? 'Çok fazla hatalı deneme yaptın. Lütfen yeni bir kod iste.' : message,
    );
  }

  async login(email: string, pass: string) {
    const user = await this.usersService.login(email, pass);
    if (!user) {
      throw new UnauthorizedException('Hatalı e-posta veya şifre girdiniz.');
    }

    if (!user.isEmailVerified) {
      let token = user.emailVerificationToken;
      if (!token) {
        token = generateCode();
        await this.usersService.updateVerificationToken(user.id, token);
      }
      await this.mailService.sendVerificationEmail(user.email, token);
      return {
        success: false,
        requiresVerification: true,
        email: user.email,
        message:
          'Hesabınız henüz doğrulanmamış. Yeni doğrulama kodu e-postanıza gönderildi.',
      };
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };
    // Dogrulama kodu yalnizca yukaridaki kontrol icin yuklendi; yanita girmesin.
    user.emailVerificationToken = null;
    return {
      success: true,
      user,
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(body: RegisterDto) {
    const user = await this.usersService.create(body);
    const token =
      user.emailVerificationToken ||
      generateCode();

    if (!user.emailVerificationToken) {
      await this.usersService.updateVerificationToken(user.id, token);
    }

    await this.mailService.sendVerificationEmail(user.email, token);

    return {
      success: true,
      requiresVerification: true,
      email: user.email,
      message:
        'Kayıt başarılı! Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu girin.',
    };
  }

  async verifyEmail(email: string, token: string) {
    const user = await this.usersService.findByEmailWithSecrets(email);
    if (!user || !user.emailVerificationToken) {
      throw new UnauthorizedException('Geçersiz veya hatalı doğrulama kodu.');
    }
    if (user.emailVerificationToken !== token) {
      await this.rejectWrongCode(user.id, user.codeAttempts, 'Geçersiz veya hatalı doğrulama kodu.');
    }

    await this.usersService.markEmailAsVerified(user.id);
    const updatedUser = await this.usersService.findById(user.id);

    const payload: JwtPayload = {
      sub: updatedUser!.id,
      email: updatedUser!.email,
      username: updatedUser!.username,
    };
    return {
      success: true,
      user: updatedUser,
      access_token: this.jwtService.sign(payload),
      message: 'E-posta adresiniz başarıyla doğrulandı!',
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
    const token = generateCode();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // 1 saat geçerli

    await this.usersService.updateResetToken(user.id, token, expiry);
    const sent = await this.mailService.sendResetPasswordEmail(email, token);
    if (!sent) {
      throw new UnauthorizedException('E-posta gönderilemedi, lütfen SMTP ayarlarınızı kontrol edin veya tekrar deneyin.');
    }

    return {
      success: true,
      message: 'Şifre sıfırlama kodu e-posta adresinize gönderildi.',
    };
  }

  // ── 4. ŞİFREYİ SIFIRLA ──
  async resetPassword(email: string, token: string, newPass: string) {
    const user = await this.usersService.findByEmailWithSecrets(email);
    if (!user || !user.resetPasswordToken) {
      throw new UnauthorizedException('Geçersiz veya hatalı kod.');
    }
    if (user.resetPasswordToken !== token) {
      await this.rejectWrongCode(user.id, user.codeAttempts, 'Geçersiz veya hatalı kod.');
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
