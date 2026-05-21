export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  user?: T;
  access_token?: string;
  message?: string | string[];
}

export interface AuthEnvelope<TUser> {
  success: boolean;
  user: TUser;
  access_token: string;
}

export function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object') {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.data !== undefined) {
      return envelope.data;
    }
    if (envelope.user !== undefined) {
      return envelope.user;
    }
  }

  return payload as T;
}

export function unwrapUser<TUser>(payload: TUser | ApiEnvelope<TUser>): TUser {
  return unwrapData(payload);
}

export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'İşlem tamamlanamadı. Bilgilerini kontrol edip tekrar dene.';
}
