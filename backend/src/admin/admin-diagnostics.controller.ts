import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../moderation/roles.guard';

/** Yönetici paneli: hata takibinin (Sentry) uçtan uca çalıştığını doğrulamak için. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/diagnostics')
export class AdminDiagnosticsController {
  /** Bilerek beklenmeyen bir hata fırlatır; Sentry'de "Sentry test hatası" olarak görünmeli. */
  @Post('sentry-test')
  sentryTest(): never {
    throw new Error(`Sentry test hatası (backend) ${new Date().toISOString()}`);
  }
}
