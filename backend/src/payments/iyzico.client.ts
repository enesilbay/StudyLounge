import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';

const HTTP_TIMEOUT_MS = 15_000;

/** iyzico yanitlarinin ortak alanlari. */
export interface IyzicoResponse {
  status: 'success' | 'failure';
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  [key: string]: unknown;
}

/**
 * IYZWSv2 (HMACSHA256) ile imzalanmis iyzico API istemcisi.
 * Imza: HMACSHA256(randomKey + uri.path + request.body, secretKey);
 * Authorization: "IYZWSv2 " + base64("apiKey:..&randomKey:..&signature:..").
 */
@Injectable()
export class IyzicoClient {
  constructor(private readonly configService: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('IYZICO_API_KEY') &&
      this.configService.get<string>('IYZICO_SECRET_KEY'),
    );
  }

  async post<T extends IyzicoResponse>(path: string, body: object): Promise<T> {
    const apiKey = this.configService.get<string>('IYZICO_API_KEY');
    const secretKey = this.configService.get<string>('IYZICO_SECRET_KEY');
    if (!apiKey || !secretKey) {
      throw new ServiceUnavailableException('Ödeme şu an kullanılamıyor.');
    }
    const baseUrl = (
      this.configService.get<string>('IYZICO_BASE_URL') ||
      'https://sandbox-api.iyzipay.com'
    ).replace(/\/+$/, '');

    const payload = JSON.stringify(body);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        ...signIyzicoRequest(apiKey, secretKey, path, payload),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: payload,
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    return (await response.json()) as T;
  }
}

/** Istek basliklarini uretir (test edilebilsin diye ayri ve saf). */
export function signIyzicoRequest(
  apiKey: string,
  secretKey: string,
  path: string,
  payload: string,
  randomKey = `${Date.now()}${randomBytes(6).toString('hex')}`,
): Record<string, string> {
  const signature = createHmac('sha256', secretKey)
    .update(randomKey + path + payload)
    .digest('hex');
  const auth = Buffer.from(
    `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`,
  ).toString('base64');
  return { Authorization: `IYZWSv2 ${auth}`, 'x-iyzi-rnd': randomKey };
}
