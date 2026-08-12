import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && host.includes('gmail')) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      '"StudyLounge" <iamenesilbay@gmail.com>';

    const mailOptions = {
      from,
      to: email,
      subject: 'StudyLounge - E-posta Doğrulama Kodu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E8EAF6; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1A237E; margin: 0; font-size: 26px; font-weight: 800;">StudyLounge</h1>
            <p style="color: #6B7280; font-size: 14px; margin-top: 4px;">Ayrı Masalarda, Aynı Lobide.</p>
          </div>
          <div style="padding: 20px; background-color: #F8FAFC; border-radius: 12px; text-align: center;">
            <p style="color: #1F2937; font-size: 15px; margin-bottom: 16px;">Hoş geldin! Hesabını aktifleştirmek için aşağıdaki 6 haneli doğrulama kodunu uygulamaya girin:</p>
            <div style="display: inline-block; padding: 14px 28px; background: #1A237E; border-radius: 10px; margin: 10px 0;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #FFC107;">
                ${token}
              </span>
            </div>
            <p style="color: #6B7280; font-size: 12px; margin-top: 16px;">Bu kod hesabınızı güvenceye almak içindir. Kimseyle paylaşmayın.</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 24px 0;">
          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">StudyLounge Ekibi</p>
        </div>
      `,
    };

    try {
      const info = (await this.transporter.sendMail(mailOptions)) as Record<
        string,
        any
      >;
      console.log(
        `[MailService] Doğrulama e-postası başarıyla gönderildi: ${String(info.messageId)} (${email})`,
      );
      return true;
    } catch (error) {
      console.error('[MailService] Doğrulama e-postası gönderilemedi:', error);
      console.log(`[MailService] DOĞRULAMA KODU (LOG): ${token}`);
      return false;
    }
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

  async sendPasswordChangeCodeEmail(email: string, token: string) {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      '"StudyLounge Support" <support@studylounge.com>';

    const mailOptions = {
      from,
      to: email,
      subject: 'Şifre Değişikliği Doğrulama Kodu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1A237E; text-align: center;">StudyLounge</h2>
          <p>Merhaba,</p>
          <p>Profil ayarlarınızdan şifre değiştirme talebinde bulundunuz. Onaylamak için aşağıdaki 6 haneli kodu kullanın:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #FFC107; background: #f9f9f9; padding: 10px 20px; border-radius: 5px; border: 1px dashed #1A237E;">
              ${token}
            </span>
          </div>
          <p>Bu kod 15 dakika geçerlidir.</p>
        </div>
      `,
    };

    try {
      const info = (await this.transporter.sendMail(mailOptions)) as Record<
        string,
        any
      >;
      console.log(
        `[MailService] Şifre değiştirme e-postası gönderildi: ${String(info.messageId)}`,
      );
      console.log(`[MailService] Şifre değiştirme kodu (${email}): ${token}`);
      return true;
    } catch (error) {
      console.error('[MailService] E-posta gönderilemedi:', error);
      console.log(`[MailService] ŞİFRE DEĞİŞTİRME KODU (GÖNDERİLEMEDİ): ${token}`);
      return false;
    }
  }
}
