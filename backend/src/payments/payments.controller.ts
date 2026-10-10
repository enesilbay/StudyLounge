import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  plans() {
    return this.paymentsService.plans();
  }

  @Get('status')
  status(@CurrentUser() user: User) {
    return this.paymentsService.status(user.id);
  }

  // Kullanici basina 10 dakikada 10 odeme baslatma.
  @Throttle({ default: { limit: 10, ttl: 10 * 60_000 } })
  @Post('checkout')
  checkout(
    @CurrentUser() user: User,
    @Body() body: CheckoutDto,
    @Ip() ip: string,
  ) {
    return this.paymentsService.createCheckout(user.id, body.planId, ip);
  }
}

/**
 * iyzico odeme sayfasi bitince tarayiciyi buraya (form POST, "token" alani) gonderir.
 * Oturum gerektirmez; token'in gecerliligi iyzico'ya sorularak dogrulanir.
 */
@Controller('payments/iyzico')
export class IyzicoCallbackController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('callback')
  @HttpCode(303)
  async callback(
    @Body('token') token: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.paymentsService.completeCheckout(
      typeof token === 'string' ? token : undefined,
    );
    const outcome =
      result === 'success'
        ? 'basarili'
        : result === 'pending'
          ? 'beklemede'
          : 'basarisiz';
    res.redirect(
      303,
      `${this.paymentsService.webAppUrl()}/app/premium?odeme=${outcome}`,
    );
  }
}
