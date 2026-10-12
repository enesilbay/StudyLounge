import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { BarChart3, Check, Crown, FileUp, Loader2, LockKeyhole, UsersRound, Video } from 'lucide-react';
import { Notice } from '../components/ui';
import { AppPage, Card, CardTitle, Rise } from '../components/app/Kit';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiResponses';
import { formatTry, monthlyEquivalent, parsePaymentOutcome } from '../lib/payments';
import type { PaymentOutcome, PremiumPlan, PremiumPlanId, PremiumStatus } from '../lib/payments';
import { useAuthStore } from '../store/authStore';

const features = [
  { icon: Video, image: 'kamera', title: 'Kameralı oda kur', text: 'Arkadaşlarınla kamerayı açıp ekran paylaşabileceğin, en fazla 6 kişilik odalar aç.' },
  { icon: Crown, image: 'kupa', title: 'Elite odalar', text: 'Sadece Premium üyelerin girdiği, odak süresinin 2 kat sayıldığı odalara katıl.' },
  { icon: BarChart3, image: 'hedef', title: 'Detaylı analitik', text: 'Haftalık grafikler ve verimli saatlerini gör.' },
  { icon: UsersRound, image: 'bos-sandalye', title: 'Daha iyi grup yönetimi', text: 'Gizli odalarda daha fazla kişiyle çalış.' },
  { icon: FileUp, image: 'kitaplar', title: 'Paylaşım araçları', text: 'PDF ve görselleri çalışma odalarında düzenli paylaş.' },
];

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' });
const shortDate = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' });

const OUTCOME_MESSAGES: Record<PaymentOutcome, { tone: 'success' | 'danger' | 'info'; text: string }> = {
  basarili: { tone: 'success', text: 'Ödemen alındı, Premium hesabında açıldı. İyi çalışmalar!' },
  basarisiz: { tone: 'danger', text: 'Ödeme tamamlanamadı ve kartından para çekilmedi. Bilgilerini kontrol edip tekrar deneyebilirsin.' },
  beklemede: { tone: 'info', text: 'Ödemenin sonucunu henüz doğrulayamadık. Birkaç dakika sonra bu sayfayı yenile; sorun sürerse geri bildirim gönder.' },
};

export default function PremiumPage() {
  const reduce = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [selected, setSelected] = useState<PremiumPlanId>('yearly');
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // iyzico'dan dönüşteki sonuç bir kez okunur, sonra adres temizlenir.
  const [outcome] = useState<PaymentOutcome | null>(() => parsePaymentOutcome(searchParams.get('odeme')));

  useEffect(() => {
    api
      .get<{ plans: PremiumPlan[]; enabled: boolean }>('/payments/plans')
      .then((response) => {
        setPlans(response.data.plans);
        setPaymentsEnabled(response.data.enabled);
      })
      .catch((loadError: unknown) => setError(getApiErrorMessage(loadError)));
    api
      .get<PremiumStatus>('/payments/status')
      .then((response) => setStatus(response.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!outcome) return;
    setSearchParams({}, { replace: true });
    if (outcome === 'basarili') void refreshUser();
  }, [outcome, setSearchParams, refreshUser]);

  const checkout = async () => {
    setRedirecting(true);
    setError(null);
    try {
      const response = await api.post<{ paymentPageUrl: string }>('/payments/checkout', { planId: selected });
      window.location.assign(response.data.paymentPageUrl);
    } catch (checkoutError) {
      setError(getApiErrorMessage(checkoutError));
      setRedirecting(false);
    }
  };

  const plan = plans.find((item) => item.id === selected);
  const premiumUntil = status?.premiumUntil ? new Date(status.premiumUntil) : null;
  const isPremium = status?.isPremium ?? Boolean(user?.isPremium);

  return (
    <AppPage title="Premium">
      <div className="space-y-4">
        {outcome ? <Notice tone={OUTCOME_MESSAGES[outcome].tone}>{OUTCOME_MESSAGES[outcome].text}</Notice> : null}

        {/* Üst bant */}
        <Rise as="section" className="relative overflow-hidden rounded-[24px] bg-mb-solid text-mb-on-solid shadow-mb-raised">
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-96 w-[34rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-lamp) 55%, transparent), transparent)' }}
            initial={{ opacity: 0.45 }}
            animate={reduce ? { opacity: 0.6 } : { opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-36 -left-24 h-80 w-[28rem] rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-action-2) 70%, transparent), transparent)' }}
          />
          <div className="relative flex items-center gap-6 px-6 py-7 md:px-10 md:py-9">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mb-on-solid/10 px-3 py-1 text-[13px] font-medium">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                {isPremium ? 'Premium hesabında açık' : 'StudyLounge Premium'}
              </span>
              <h2 className="mt-4 max-w-xl font-mb-display text-[2rem] font-light leading-[1.1] tracking-[-0.04em] md:text-[2.75rem]">Kendi odanı kur, kamerayı aç, Elite masalara otur.</h2>
              <p className="mt-3 max-w-lg text-[15px] text-mb-on-solid/70">
                {isPremium
                  ? premiumUntil
                    ? `${dateFormatter.format(premiumUntil)} tarihine kadar açık. Süre bitmeden yeni plan alırsan kalan sürenin sonuna eklenir.`
                    : 'Süresiz olarak tanımlandı.'
                  : 'Otomatik yenileme yok; süre bitince Premium kapanır, istersen yeniden alırsın.'}
              </p>
            </div>
            <m.img
              src="/landing/3b/lamba.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none hidden w-36 shrink-0 select-none drop-shadow-[0_24px_40px_rgb(0_0_0/0.4)] md:block lg:w-44"
              animate={reduce ? undefined : { y: [0, -10, 0], rotate: [-4, -1, -4] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </Rise>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
          {/* Özellikler */}
          <ul className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <m.li
                key={feature.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.45, delay: 0.1 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={`group flex items-start gap-4 rounded-[20px] border border-mb-line/70 bg-mb-card p-5 shadow-mb-card ${index === 0 ? 'sm:col-span-2' : ''}`}
              >
                <img src={`/landing/3b/${feature.image}.webp`} alt="" aria-hidden="true" loading="lazy" draggable={false} className="h-16 w-16 shrink-0 select-none object-contain transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" />
                <div className="min-w-0">
                  <h3 className="font-mb-display text-[17px] font-medium tracking-[-0.02em] text-mb-ink">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-mb-body">{feature.text}</p>
                </div>
              </m.li>
            ))}
          </ul>

          {/* Plan seçimi ve ödeme (telefonda özelliklerin üstünde) */}
          <div className="order-first space-y-4 xl:order-none">
            <Rise delay={0.15}>
              <Card className="p-5 md:p-6">
                <fieldset>
                  <legend className="font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{isPremium ? 'Süreni uzat' : 'Planını seç'}</legend>
                  <div className="mt-4 space-y-3">
                    {plans.length === 0 && !error ? <p className="flex items-center gap-2 text-sm text-mb-body"><Loader2 className="h-4 w-4 animate-spin" /> Planlar yükleniyor…</p> : null}
                    {plans.map((item) => {
                      const active = item.id === selected;
                      return (
                        <label
                          key={item.id}
                          className={`relative flex cursor-pointer items-start gap-3 rounded-[16px] border-2 p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-mb-action ${
                            active ? 'border-mb-action bg-mb-tint/60' : 'border-mb-line hover:border-mb-action/40'
                          }`}
                        >
                          <input type="radio" name="premium-plan" value={item.id} checked={active} onChange={() => setSelected(item.id)} className="sr-only" />
                          <span aria-hidden="true" className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${active ? 'border-mb-action bg-mb-action' : 'border-mb-line'}`}>
                            <AnimatePresence>
                              {active ? (
                                <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                                  <Check className="h-3 w-3 text-mb-on-action" strokeWidth={3} />
                                </m.span>
                              ) : null}
                            </AnimatePresence>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-mb-ink">{item.name}</span>
                              {item.savings > 0 ? <span className="rounded-full bg-mb-action px-2 py-0.5 text-[11px] font-semibold text-mb-on-action">%{item.savingsPercent} indirim</span> : null}
                            </span>
                            <span className="mt-1 block font-mb-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] text-mb-ink">
                              {formatTry(item.price)}
                              <span className="text-base text-mb-body"> / {item.months === 12 ? 'yıl' : 'ay'}</span>
                            </span>
                            {item.savings > 0 ? (
                              <span className="mt-1 block text-[13px] text-mb-body">
                                Ayda {formatTry(monthlyEquivalent(item))}'e gelir; {formatTry(item.savings)} tasarruf.
                              </span>
                            ) : (
                              <span className="mt-1 block text-[13px] text-mb-body">Bir ay boyunca Premium.</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <ul className="mt-5 space-y-2">
                  {['Oda kurma ve kameralı odalar', 'Elite oda erişimi', 'Premium profil çerçeveleri', 'Detaylı haftalık analiz'].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[15px] text-mb-ink">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mb-tint text-mb-action">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                {error ? (
                  <div className="mt-5">
                    <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={!plan || !paymentsEnabled || redirecting}
                  onClick={() => void checkout()}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-mb-action to-mb-action-2 px-6 text-[15px] font-medium text-mb-on-action shadow-mb-press transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {redirecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {!paymentsEnabled ? 'Ödeme şu an kapalı' : plan ? `${formatTry(plan.price)} öde` : 'Planlar yükleniyor'}
                </button>
                <p className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-mb-surface p-3 text-[13px] leading-5 text-mb-body">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Ödeme iyzico'nun güvenli sayfasında yapılır; kart bilgin StudyLounge'a ulaşmaz.
                </p>
              </Card>
            </Rise>

            {status && status.payments.length > 0 ? (
              <Rise delay={0.25}>
                <Card className="p-5 md:p-6">
                  <CardTitle>Ödeme geçmişi</CardTitle>
                  <ul className="mt-3 divide-y divide-mb-line">
                    {status.payments.map((payment) => (
                      <li key={payment.id} className="flex items-center gap-3 py-2.5 text-[15px]">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-mb-ink">{payment.planId === 'yearly' ? 'Yıllık Premium' : 'Aylık Premium'}</span>
                          <span className="block text-[13px] text-mb-body">{shortDate.format(new Date(payment.createdAt))}</span>
                        </span>
                        <span className="tabular-nums text-mb-ink">{formatTry(payment.amount)}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${payment.status === 'success' ? 'bg-mb-tint text-mb-action' : 'bg-softDanger text-danger'}`}>
                          {payment.status === 'success' ? 'Ödendi' : 'Başarısız'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Rise>
            ) : null}
          </div>
        </div>
      </div>
    </AppPage>
  );
}
