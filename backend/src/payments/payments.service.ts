import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(private configService: ConfigService) {}

  async createPaymentIntent(amount: number, currency = 'try') {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeKey) {
      try {
        const params = new URLSearchParams();
        params.append('amount', String(Math.round(amount * 100)));
        params.append('currency', currency);
        params.append('payment_method_types[]', 'card');

        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const data = (await response.json()) as Record<string, any>;
        if (!response.ok) {
          throw new Error(
            data.error?.message || 'Stripe ödeme isteği oluşturulamadı.',
          );
        }

        return {
          clientSecret: data.client_secret,
          publishableKey:
            this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') ||
            'pk_test_sample',
          paymentIntentId: data.id,
          testMode: false,
        };
      } catch (err: any) {
        console.error('[PaymentsService] Stripe API Hatası:', err.message);
      }
    }

    const mockIntentId = `pi_test_${Date.now()}`;
    const mockSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 10)}`;

    return {
      clientSecret: mockSecret,
      publishableKey:
        this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') ||
        'pk_test_51MockStripeKeyForStudyLoungeDemo',
      paymentIntentId: mockIntentId,
      testMode: true,
      message: 'Stripe test ödeme simülasyonu hazır.',
    };
  }
}
