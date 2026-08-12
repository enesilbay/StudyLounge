import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  async createIntent(@Body() body: { amount?: number; currency?: string }) {
    const amount = body.amount || 49;
    const currency = body.currency || 'try';
    return this.paymentsService.createPaymentIntent(amount, currency);
  }
}
