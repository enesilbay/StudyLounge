/** Bitiş varsayılanı: başlangıçtan (boşsa şimdiden) `hours` saat sonrası. Gönderim anında hesaplanır. */
export function defaultEnd(startsAt: string, hours: number, now = Date.now()): Date {
  const from = startsAt ? new Date(startsAt) : new Date(now);
  return new Date(from.getTime() + hours * 3600 * 1000);
}
