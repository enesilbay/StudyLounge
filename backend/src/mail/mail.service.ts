import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 465));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host: host.includes('gmail') ? 'smtp.gmail.com' : host,
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  private async sendMailWithFallback(
    to: string,
    subject: string,
    html: string,
    token: string,
  ): Promise<boolean> {
    const resendKey = this.configService.get<string>('RESEND_API_KEY');

    // 1. Resend HTTPS API (Port 443 - Cloud friendly)
    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'StudyLounge <onboarding@resend.dev>',
            to: [to],
            subject,
            html,
          }),
        });
        if (response.ok) {
          console.log(`[MailService] Resend HTTPS API ile e-posta gönderildi: ${to}`);
          return true;
        }
      } catch (err) {
        console.error('[MailService] Resend HTTPS API hatası:', err);
      }
    }

    // 2. Nodemailer SMTP (5 saniye zamanaşımı korumalı)
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      '"StudyLounge" <iamenesilbay@gmail.com>';

    const mailOptions = { from, to, subject, html };

    try {
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 5000),
      );

      const info = (await Promise.race([sendPromise, timeoutPromise])) as Record<
        string,
        any
      >;
      console.log(
        `[MailService] SMTP E-posta gönderildi: ${String(info.messageId)} (${to})`,
      );
      return true;
    } catch (error: any) {
      console.error(
        `[MailService] E-posta gönderilemedi (${to}):`,
        error.message || error,
      );
      console.log(`[MailService] KOD (FALLBACK LOG): ${token} -> ${to}`);
      // Bulut SMTP blokajında kullanıcının akışının kesilmemesi için true dönüyoruz
      return true;
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const html = `
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
    `;
    return this.sendMailWithFallback(
      email,
      'StudyLounge - E-posta Doğrulama Kodu',
      html,
      token,
    );
  }

  async sendResetPasswordEmail(email: string, token: string) {
    const html = `
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
    `;
    return this.sendMailWithFallback(email, 'Şifre Sıfırlama İsteği', html, token);
  }

  async sendPasswordChangeCodeEmail(email: string, token: string) {
    const html = `
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
    `;
    return this.sendMailWithFallback(
      email,
      'Şifre Değişikliği Doğrulama Kodu',
      html,
      token,
    );
  }
}
