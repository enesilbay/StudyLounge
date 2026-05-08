import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendResetPasswordEmail(email: string, token: string) {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      '"StudyLounge Support" <support@studylounge.com>';

    const mailOptions = {
      from,
      to: email,
      subject: 'Şifre Sıfırlama İsteği',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1A237E; text-align: center;">StudyLounge</h2>
          <p>Merhaba,</p>
          <p>Hesabınız için bir şifre sıfırlama isteği aldık. Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu uygulamaya girin:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #FFC107; background: #f9f9f9; padding: 10px 20px; border-radius: 5px; border: 1px dashed #1A237E;">
              ${token}
            </span>
          </div>
          <p>Bu kod 1 saat boyunca geçerlidir. Eğer bu isteği siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">StudyLounge Ekibi</p>
        </div>
      `,
    };

    try {
      const info = (await this.transporter.sendMail(mailOptions)) as Record<
        string,
        any
      >;
      console.log(
        `[MailService] E-posta gönderildi: ${String(info.messageId)}`,
      );
      console.log(`[MailService] Şifre sıfırlama kodu (${email}): ${token}`);
      return true;
    } catch (error) {
      console.error('[MailService] E-posta gönderilemedi:', error);
      // Geliştirme kolaylığı için hataya rağmen kodu konsola basmaya devam edelim
      console.log(`[MailService] KOD (GÖNDERİLEMEDİ): ${token}`);
      return false;
    }
  }
}
