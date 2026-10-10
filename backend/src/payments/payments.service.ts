import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, LessThan, Not, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { IyzicoClient, IyzicoResponse } from './iyzico.client';
import { Payment, PaymentStatus } from './payment.entity';
import {
  extendPremiumUntil,
  PREMIUM_PLANS,
  PremiumPlanId,
  publicPlans,
} from './plans';

interface CheckoutInitResponse extends IyzicoResponse {
  token?: string;
  paymentPageUrl?: string;
}

interface CheckoutDetailResponse extends IyzicoResponse {
  paymentStatus?: string;
  paymentId?: string;
  basketId?: string;
  paidPrice?: number | string;
  currency?: string;
  fraudStatus?: number;
}

// iyzico alici bilgisi zorunlu tutuyor. Kapali betada kullanicidan fatura bilgisi
// istenmez; yer tutucu degerler gonderilir. Canliya gecerken (Faz 6) gercek
// fatura bilgisi toplanacak.
const PLACEHOLDER_IDENTITY_NUMBER = '11111111111';
const PLACEHOLDER_CITY = 'Istanbul';
const PLACEHOLDER_COUNTRY = 'Turkey';
const PLACEHOLDER_ADDRESS = 'Dijital hizmet, adres gerekmez';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly iyzico: IyzicoClient,
    private readonly configService: ConfigService,
  ) {}

  plans() {
    return { plans: publicPlans(), enabled: this.iyzico.isConfigured };
  }

  /** Backend'in disaridan erisilen adresi (iyzico callback'i buraya gelir). */
  private apiPublicUrl(): string {
    const configured =
      this.configService.get<string>('PUBLIC_API_URL') ||
      this.configService.get<string>('RENDER_EXTERNAL_URL') ||
      `http://localhost:${this.configService.get<string>('PORT') ?? '3000'}`;
    return configured.replace(/\/+$/, '');
  }

  /** Odemeden sonra kullanicinin donecegi web adresi. */
  webAppUrl(): string {
    const configured = this.configService.get<string>('WEB_APP_URL');
    const fromCors = this.configService
      .get<string>('CORS_ORIGIN')
      ?.split(',')
      .map((origin) => origin.trim())
      .find((origin) => origin && origin !== '*');
    return (configured || fromCors || 'http://localhost:5173').replace(
      /\/+$/,
      '',
    );
  }

  /** Odeme formunu baslatir; kullanici donen adrese (iyzico odeme sayfasi) yonlendirilir. */
  async createCheckout(userId: number, planId: PremiumPlanId, ip: string) {
    const plan = PREMIUM_PLANS[planId];
    if (!plan) throw new BadRequestException('Geçersiz plan.');
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const price = plan.price.toFixed(2);
    const payment = await this.paymentsRepository.save(
      this.paymentsRepository.create({
        user: { id: userId },
        planId: plan.id,
        amount: price,
        conversationId: randomUUID(),
      }),
    );

    const [name, ...rest] = (user.fullName || user.username)
      .trim()
      .split(/\s+/);
    const surname = rest.join(' ') || name;
    const contactName = `${name} ${surname}`.slice(0, 100);
    const address = {
      contactName,
      city: PLACEHOLDER_CITY,
      country: PLACEHOLDER_COUNTRY,
      address: PLACEHOLDER_ADDRESS,
    };

    let response: CheckoutInitResponse;
    try {
      response = await this.iyzico.post<CheckoutInitResponse>(
        '/payment/iyzipos/checkoutform/initialize/auth/ecom',
        {
          locale: 'tr',
          conversationId: payment.conversationId,
          price,
          paidPrice: price,
          currency: 'TRY',
          basketId: String(payment.id),
          paymentGroup: 'PRODUCT',
          callbackUrl: `${this.apiPublicUrl()}/payments/iyzico/callback`,
          enabledInstallments: [1],
          buyer: {
            id: String(user.id),
            name,
            surname,
            identityNumber: PLACEHOLDER_IDENTITY_NUMBER,
            email: user.email,
            registrationAddress: PLACEHOLDER_ADDRESS,
            city: PLACEHOLDER_CITY,
            country: PLACEHOLDER_COUNTRY,
            ip: ip || '127.0.0.1',
          },
          billingAddress: address,
          shippingAddress: address,
          basketItems: [
            {
              id: plan.id,
              name: plan.name,
              category1: 'Premium üyelik',
              itemType: 'VIRTUAL',
              price,
            },
          ],
        },
      );
    } catch (error) {
      await this.markFailed(payment.id, 'iyzico isteği başarısız');
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException(
            'Ödeme başlatılamadı. Biraz sonra tekrar dene.',
          );
    }

    if (
      response.status !== 'success' ||
      !response.token ||
      !response.paymentPageUrl
    ) {
      const reason = response.errorMessage ?? 'Bilinmeyen hata';
      this.logger.warn(
        `iyzico odeme baslatma hatasi (${response.errorCode}): ${reason}`,
      );
      await this.markFailed(payment.id, reason);
      throw new BadRequestException(
        'Ödeme başlatılamadı. Biraz sonra tekrar dene.',
      );
    }

    await this.paymentsRepository.update(payment.id, { token: response.token });
    return { paymentPageUrl: response.paymentPageUrl };
  }

  /**
   * iyzico'nun callback'iyle gelen token'i isler. Sonuc iyzico'ya tekrar sorulur;
   * tutar, sepet ve eslestirme kimligi tutarsa Premium uzatilir. Ayni odeme iki kez islenmez.
   */
  async completeCheckout(token: string | undefined): Promise<PaymentStatus> {
    if (!token) return 'failure';
    const payment = await this.paymentsRepository.findOne({
      where: { token },
      relations: { user: true },
    });
    if (!payment) return 'failure';
    if (payment.status !== 'pending') return payment.status;

    let detail: CheckoutDetailResponse;
    try {
      detail = await this.iyzico.post<CheckoutDetailResponse>(
        '/payment/iyzipos/checkoutform/auth/ecom/detail',
        { locale: 'tr', conversationId: payment.conversationId, token },
      );
    } catch {
      // iyzico'ya ulasilamadi; odeme bekliyor olarak kalir, kullanici yeniden deneyebilir.
      return 'pending';
    }

    const failure = this.verifyDetail(payment, detail);
    if (failure) {
      this.logger.warn(`Odeme ${payment.id} reddedildi: ${failure}`);
      await this.markFailed(payment.id, failure);
      return 'failure';
    }

    const plan = PREMIUM_PLANS[payment.planId as PremiumPlanId];
    return this.dataSource.transaction(async (manager) => {
      // Odemeyi "pending"den "success"e yalnizca bir istek cevirebilir.
      const claimed = await manager.update(
        Payment,
        { id: payment.id, status: 'pending' },
        {
          status: 'success',
          providerPaymentId: detail.paymentId ?? null,
          completedAt: new Date(),
        },
      );
      if (!claimed.affected) return 'success' as const;

      const user = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.premiumUntil')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id: payment.user.id })
        .getOne();
      if (!user) return 'success' as const;

      const premiumUntil = extendPremiumUntil(user.premiumUntil, plan.months);
      await manager.update(User, user.id, { isPremium: true, premiumUntil });
      await manager.update(Payment, payment.id, { premiumUntil });
      this.logger.log(
        `Odeme ${payment.id} basarili; kullanici ${user.id} Premium ${premiumUntil.toISOString()}'e kadar.`,
      );
      return 'success' as const;
    });
  }

  /** Dogrulama hatasi varsa nedenini, yoksa null dondurur. */
  private verifyDetail(
    payment: Payment,
    detail: CheckoutDetailResponse,
  ): string | null {
    if (detail.status !== 'success')
      return detail.errorMessage ?? 'Ödeme sorgusu başarısız';
    if (detail.paymentStatus !== 'SUCCESS')
      return `Ödeme durumu: ${detail.paymentStatus ?? 'bilinmiyor'}`;
    if (detail.conversationId !== payment.conversationId)
      return 'Eşleştirme kimliği tutmuyor';
    if (String(detail.basketId) !== String(payment.id))
      return 'Sepet numarası tutmuyor';
    if (Math.abs(Number(detail.paidPrice) - Number(payment.amount)) > 0.009)
      return 'Tutar tutmuyor';
    if (detail.currency && detail.currency !== payment.currency)
      return 'Para birimi tutmuyor';
    if (detail.fraudStatus !== undefined && detail.fraudStatus !== 1)
      return 'Ödeme incelemede';
    return null;
  }

  private async markFailed(id: number, reason: string) {
    await this.paymentsRepository.update(
      { id, status: 'pending' },
      {
        status: 'failure',
        failureReason: reason.slice(0, 300),
        completedAt: new Date(),
      },
    );
  }

  /** Kullanicinin Premium durumu ve odeme gecmisi. */
  async status(userId: number) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.premiumUntil')
      .where('user.id = :id', { id: userId })
      .getOne();
    const payments = await this.paymentsRepository.find({
      where: { user: { id: userId }, status: Not('pending') },
      select: {
        id: true,
        planId: true,
        amount: true,
        currency: true,
        status: true,
        premiumUntil: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      isPremium: Boolean(user?.isPremium),
      premiumUntil: user?.premiumUntil ?? null,
      payments,
    };
  }

  /** Suresi dolan Premium'lari kapatir. Bitis tarihi olmayan (elle verilen) Premium'a dokunmaz. */
  @Cron(CronExpression.EVERY_HOUR)
  async expirePremiums() {
    const result = await this.usersRepository.update(
      { isPremium: true, premiumUntil: LessThan(new Date()) },
      { isPremium: false },
    );
    if (result.affected)
      this.logger.log(`${result.affected} kullanicinin Premium suresi doldu.`);
  }
}
