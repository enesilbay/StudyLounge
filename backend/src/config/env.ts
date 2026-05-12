import { ConfigService } from '@nestjs/config';

export function getConfigString(
  configService: ConfigService,
  key: string,
  fallback?: string,
): string {
  const value = configService.get<string>(key);
  if (value && value.trim() !== '') {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`${key} environment variable is required.`);
}

export function getConfigNumber(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const value = configService.get<string>(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a valid number.`);
  }

  return parsed;
}

export function getConfigBoolean(
  configService: ConfigService,
  key: string,
  fallback: boolean,
): boolean {
  const value = configService.get<string>(key);
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');
  if (secret && secret.trim() !== '') {
    return secret;
  }

  const nodeEnv = configService.get<string>('NODE_ENV');
  if (nodeEnv === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production.',
    );
  }

  return 'development-only-jwt-secret-change-me';
}
