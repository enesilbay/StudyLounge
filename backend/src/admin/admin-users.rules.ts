import { BadRequestException, ForbiddenException } from '@nestjs/common';

/** Kullanıcı listesinde birleştirilebilen filtreler (hepsi VE ile uygulanır). */
export const USER_FILTERS = [
  'premium',
  'admin',
  'muted',
  'banned',
  'unverified',
  'google',
] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export const USER_SORTS = [
  'createdAt',
  'lastFocus',
  'totalFocus',
  'lastSeen',
] as const;
export type UserSort = (typeof USER_SORTS)[number];

export const PREMIUM_GRANTS = ['month', 'year', 'unlimited'] as const;
export type PremiumGrant = (typeof PREMIUM_GRANTS)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Yöneticinin bir kullanıcıya uygulayabileceği hassas işlemler için ortak kural:
 * kendine rol değiştiremez ve kendini silemez; başka bir yöneticiyi silmek için önce rolü düşürülür.
 * (Susturma ve yasak kuralları ModerationService'te aynıdır.)
 */
export function assertCanManage(
  adminId: number,
  target: { id: number; role: string },
  action: 'role' | 'delete_user',
) {
  if (adminId === target.id) {
    throw new BadRequestException(
      action === 'role'
        ? 'Kendi rolünü değiştiremezsin.'
        : 'Kendi hesabını buradan silemezsin.',
    );
  }
  if (action === 'delete_user' && target.role === 'admin') {
    throw new ForbiddenException(
      'Bir yöneticiyi silmeden önce rolünü kullanıcıya çevir.',
    );
  }
}

/**
 * CSV hücresi: `;` ayraçlı (Türkçe Excel), tırnak kaçışlı. `=`, `+`, `-`, `@` ile başlayan
 * metinler formül olarak çalışmasın diye başına `'` eklenir (CSV enjeksiyonu).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value as string | number | boolean);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // BOM: Excel UTF-8'i (Türkçe karakterleri) doğru açsın.
  return (
    '﻿' +
    [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
  );
}

/** ILIKE araması için %, _ ve \ karakterlerini kaçırır. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
