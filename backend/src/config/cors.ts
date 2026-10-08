/**
 * CORS izinli origin'leri ortam degiskenlerinden okur.
 * - CORS_ORIGIN: virgulle ayrilmis tam adresler.
 * - CORS_ORIGIN_PATTERN: istege bagli duzenli ifade; yalnizca test ortaminda
 *   Netlify PR on izlemelerine (deploy-preview-<N>--...) izin vermek icin ayarlanir.
 *   Ifade tum adrese uyacak sekilde ^...$ ile sarilir.
 * Hicbiri ayarli degilse (ya da CORS_ORIGIN '*' ise ve desen yoksa) undefined doner;
 * varsayilani cagiran taraf secer.
 */
export function parseCorsOrigins(
  corsOrigin?: string,
  corsOriginPattern?: string,
): (string | RegExp)[] | undefined {
  const origins: (string | RegExp)[] =
    corsOrigin && corsOrigin !== '*'
      ? corsOrigin
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : [];

  const pattern = corsOriginPattern?.trim();
  if (pattern) {
    try {
      origins.push(new RegExp(`^(?:${pattern})$`));
    } catch {
      console.warn(
        'WARNING: CORS_ORIGIN_PATTERN gecerli bir duzenli ifade degil; yok sayildi.',
      );
    }
  }

  return origins.length > 0 ? origins : undefined;
}
