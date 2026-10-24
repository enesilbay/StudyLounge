import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { codeMailHtml } from './mail-template';

const SMTP_TIMEOUT_MS = 10_000;
const HTTP_TIMEOUT_MS = 10_000;

/** "Ad <adres@ornek.com>" ya da yalin "adres@ornek.com" bicimini ayristirir. */
export function parseSender(value: string): { name?: string; email: string } {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
  }
  return { email: value.trim() };
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly smtpLabel: string;

  constructor(private configService: ConfigService) {
    const rawHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const host = rawHost.includes('gmail') ? 'smtp.gmail.com' : rawHost;
    // 465 dogrudan TLS, 587 (ve digerleri) STARTTLS ile baglanir.
    const port = Number(this.configService.get<string>('SMTP_PORT', '465'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.smtpLabel = `${host}:${port}`;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: SMTP_TIMEOUT_MS,
      });
    }
  }

  /** Acilista SMTP ayarlarini dener; yanlissa e-postalar gitmeden once logda gorunur. */
  onModuleInit() {
    const hasBrevo = Boolean(this.configService.get<string>('BREVO_API_KEY'));
    const hasResend = Boolean(this.configService.get<string>('RESEND_API_KEY'));
    if (hasBrevo && !this.configService.get<string>('BREVO_FROM')) {
      this.logger.warn('BREVO_API_KEY var ama BREVO_FROM tanimli degil: Brevo ile e-posta gonderilemez.');
    }
    if (!this.transporter) {
      if (!hasBrevo && !hasResend) {
        this.logger.warn('BREVO_API_KEY, RESEND_API_KEY ve SMTP_USER/SMTP_PASS tanimli degil: e-posta gonderilemez.');
      }
      return;
    }
    // Acilisi bekletmemek icin sonucu arka planda loglar.
    this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP baglantisi hazir (${this.smtpLabel}).`))
      .catch((error: unknown) =>
        this.logger.error(
          `SMTP baglantisi kurulamadi (${this.smtpLabel}): ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  }

  /** Brevo HTTPS API ile gonderir. Gonderici (BREVO_FROM) Brevo panelinde dogrulanmis olmali. */
  private async sendWithBrevo(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
    const from = this.configService.get<string>('BREVO_FROM');
    if (!from) {
      return false;
    }
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: parseSender(from),
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      if (response.ok) {
        this.logger.log(`Brevo ile e-posta gonderildi: ${to}`);
        return true;
      }
      this.logger.error(`Brevo e-postayi reddetti (${response.status}): ${await response.text()}`);
    } catch (err) {
      this.logger.error(`Brevo hatasi: ${err instanceof Error ? err.message : String(err)}`);
    }
    return false;
  }

  /** E-postayi Brevo, Resend ya da SMTP ile (bu sirayla) gonderir. Hicbiri basaramazsa false doner. */
  private async sendMailWithFallback(
    to: string,
    subject: string,
    html: string,
    token: string,
  ): Promise<boolean> {
    // 1. Brevo HTTPS API (443 portu; Render ucretsiz plani SMTP portlarini engeller)
    const brevoKey = this.configService.get<string>('BREVO_API_KEY');
    if (brevoKey && (await this.sendWithBrevo(brevoKey, to, subject, html))) {
      return true;
    }

    const resendKey = this.configService.get<string>('RESEND_API_KEY');

    // 2. Resend HTTPS API (dogrulanmis domain olmadan yalnizca hesap sahibine gonderebilir)
    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // onboarding@resend.dev yalnizca Resend hesap sahibine gonderebilir;
            // herkese gondermek icin dogrulanmis bir domain ile RESEND_FROM verilmeli.
            from: this.configService.get<string>('RESEND_FROM') || 'StudyLounge <onboarding@resend.dev>',
            to: [to],
            subject,
            html,
          }),
        });
        if (response.ok) {
          this.logger.log(`Resend ile e-posta gonderildi: ${to}`);
          return true;
        }
        this.logger.error(`Resend e-postayi reddetti (${response.status}): ${await response.text()}`);
      } catch (err) {
        this.logger.error(`Resend hatasi: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. SMTP
    if (this.transporter) {
      const from =
        this.configService.get<string>('SMTP_FROM') ||
        `"StudyLounge" <${this.configService.get<string>('SMTP_USER')}>`;
      try {
        const info = (await this.transporter.sendMail({ from, to, subject, html })) as { messageId?: string };
        this.logger.log(`SMTP ile e-posta gonderildi: ${String(info.messageId)} (${to})`);
        return true;
      } catch (error) {
        this.logger.error(
          `SMTP ile e-posta gonderilemedi (${to}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Hicbir saglayici gonderemedi: kullanici dogrulama/sifirlama kodunu alamaz. Adres gonderilmez.
    Sentry.captureMessage('E-posta hicbir saglayiciyla gonderilemedi', { level: 'error', tags: { context: 'mail' } });

    // Gelistirmede e-posta ayari olmadan da test edilebilsin diye kod loga yazilir.
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(`[GELISTIRME] Gonderilemeyen kod: ${token} -> ${to}`);
    }
    return false;
  }

  async sendVerificationEmail(email: string, token: string) {
    const html = codeMailHtml({
      preheader: `Doğrulama kodun: ${token}`,
      title: 'Hoş geldin!',
      intro: 'Hesabını etkinleştirmek için aşağıdaki 6 haneli doğrulama kodunu uygulamaya gir.',
      code: token,
      note: 'Bu kod hesabını güvende tutmak içindir. Kimseyle paylaşma.',
    });
    return this.sendMailWithFallback(
      email,
      'StudyLounge - E-posta Doğrulama Kodu',
      html,
      token,
    );
  }

  async sendResetPasswordEmail(email: string, token: string) {
    const html = codeMailHtml({
      preheader: `Şifre sıfırlama kodun: ${token}`,
      title: 'Şifreni sıfırla',
      intro: 'Hesabın için bir şifre sıfırlama isteği aldık. Devam etmek için aşağıdaki 6 haneli kodu uygulamaya gir.',
      code: token,
      note: 'Bu kod 1 saat geçerlidir. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.',
    });
    return this.sendMailWithFallback(email, 'Şifre Sıfırlama İsteği', html, token);
  }

  async sendPasswordChangeCodeEmail(email: string, token: string) {
    const html = codeMailHtml({
      preheader: `Şifre değişikliği kodun: ${token}`,
      title: 'Şifre değişikliğini onayla',
      intro: 'Profil ayarlarından şifre değiştirme talebinde bulundun. Onaylamak için aşağıdaki 6 haneli kodu gir.',
      code: token,
      note: 'Bu kod 15 dakika geçerlidir. Bu isteği sen yapmadıysan şifreni hemen değiştir.',
    });
    return this.sendMailWithFallback(
      email,
      'Şifre Değişikliği Doğrulama Kodu',
      html,
      token,
    );
  }
}
