import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
}

/** Google ID token'ini dogrular. GOOGLE_CLIENT_ID tanimli degilse Google ile giris kapalidir. */
@Injectable()
export class GoogleTokenService {
  private readonly client = new OAuth2Client();

  constructor(private configService: ConfigService) {}

  async verify(credential: string): Promise<GoogleProfile> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Google ile giriş şu an kullanılamıyor.',
      );
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google oturumu doğrulanamadı.');
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException(
        'Google hesabının e-posta adresi doğrulanmamış.',
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      fullName: payload.name?.trim() || payload.email.split('@')[0],
    };
  }
}
