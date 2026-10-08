import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const MINUTE = 60_000;

// Kimlik dogrulama uclari kaba kuvvete karsi IP basina siki sinirlanir.
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('login')
  async login(@Body() body: LoginDto) {
    // body.email: e-posta ya da kullanici adi.
    return this.authService.login(body.email, body.password);
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('google')
  async google(@Body() body: GoogleLoginDto) {
    return this.authService.loginWithGoogle(body.credential);
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; token: string }) {
    return this.authService.verifyEmail(body.email, body.token);
  }

  @Throttle({ default: { limit: 3, ttl: MINUTE } })
  @Post('resend-verification')
  async resendVerification(@Body() body: ForgotPasswordDto) {
    return this.authService.resendVerification(body.email);
  }

  @Throttle({ default: { limit: 3, ttl: MINUTE } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.email, body.token, body.newPass);
  }
}
