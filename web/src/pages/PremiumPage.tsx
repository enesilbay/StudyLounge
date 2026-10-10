import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, Crown, FileUp, LockKeyhole, UsersRound, Video } from 'lucide-react';
import { Button, IconTile, LampMark, Notice, PageHeader, Pill, Surface } from '../components/ui';
import { api } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiResponses';
import { formatTry, monthlyEquivalent, parsePaymentOutcome } from '../lib/payments';
import type { PaymentOutcome, PremiumPlan, PremiumPlanId, PremiumStatus } from '../lib/payments';
import { useAuthStore } from '../store/authStore';

const features = [
  { icon: Video, title: 'Kameralı oda kur', text: 'Arkadaşlarınla kamerayı açıp ekran paylaşabileceğin, en fazla 6 kişilik odalar aç.' },
  { icon: Crown, title: 'Elite odalar', text: 'Sadece Premium üyelerin girdiği, odak süresinin 2 kat sayıldığı odalara katıl.' },
  { icon: BarChart3, title: 'Detaylı analitik', text: 'Haftalık grafikler ve verimli saatlerini gör.' },
  { icon: UsersRound, title: 'Daha iyi grup yönetimi', text: 'Gizli odalarda daha fazla kişiyle çalış.' },
  { icon: FileUp, title: 'Paylaşım araçları', text: 'PDF ve görselleri çalışma odalarında düzenli paylaş.' },
];

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' });
const shortDate = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' });

const OUTCOME_MESSAGES: Record<PaymentOutcome, { tone: 'success' | 'danger' | 'info'; text: string }> = {
  basarili: { tone: 'success', text: 'Ödemen alındı, Premium hesabında açıldı. İyi çalışmalar!' },
  basarisiz: { tone: 'danger', text: 'Ödeme tamamlanamadı ve kartından para çekilmedi. Bilgilerini kontrol edip tekrar deneyebilirsin.' },
  beklemede: { tone: 'info', text: 'Ödemenin sonucunu henüz doğrulayamadık. Birkaç dakika sonra bu sayfayı yenile; sorun sürerse geri bildirim gönder.' },
};

export default function PremiumPage() {
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
    <div>
      <PageHeader
        eyebrow="Premium"
        title="StudyLounge Premium"
        description="Oda kur, kameralı odalar aç, Elite odalara gir ve çalışmanı ayrıntılı analiz et."
        action={<Pill tone={isPremium ? 'success' : 'accent'}>{isPremium ? 'Premium aktif' : 'Yükseltilebilir'}</Pill>}
      />

      {outcome ? (
        <div className="mb-5">
          <Notice tone={OUTCOME_MESSAGES[outcome].tone}>{OUTCOME_MESSAGES[outcome].text}</Notice>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Surface className="overflow-hidden">
            <div className="grid grid-cols-1 gap-6 p-7 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
              <div className="grid h-36 w-36 place-items-center rounded-xl bg-lightAmber">
                <LampMark className="h-24 w-24" />
              </div>
              <div>
                <h2 className="text-4xl font-semibold text-textDark">Odak oturumlarını daha güçlü yönet.</h2>
                <p className="mt-3 text-base leading-6 text-textMuted">
                  Elite odalar, analitik, ses paketleri, profil çerçeveleri ve özel oda yönetimi tek pakette.
                </p>
              </div>
            </div>
          </Surface>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <Surface key={feature.title} className="p-5">
                <IconTile icon={feature.icon} tone="accent" />
                <h3 className="mt-4 text-lg font-semibold text-textDark">{feature.title}</h3>
                <p className="mt-2 text-base leading-6 text-textMuted">{feature.text}</p>
              </Surface>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Surface className="p-6">
            {isPremium ? (
              <div className="mb-5 rounded-lg border border-success/30 bg-softSuccess p-4">
                <p className="font-semibold text-textDark">Premium hesabında açık</p>
                <p className="mt-1 text-[15px] text-textMuted">
                  {premiumUntil
                    ? `${dateFormatter.format(premiumUntil)} tarihine kadar. Süre bitmeden yeni plan alırsan kalan sürenin sonuna eklenir.`
                    : 'Süresiz olarak tanımlandı.'}
                </p>
              </div>
            ) : null}

            <fieldset>
              <legend className="text-lg font-semibold text-textDark">{isPremium ? 'Süreni uzat' : 'Planını seç'}</legend>
              <div className="mt-3 space-y-3">
                {plans.map((item) => {
                  const active = item.id === selected;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                        active ? 'border-primary bg-softIndigo' : 'border-border hover:bg-sunken'
                      }`}
                    >
                      <input type="radio" name="premium-plan" value={item.id} checked={active} onChange={() => setSelected(item.id)} className="mt-1.5 h-4 w-4 accent-[var(--sl-primary)]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-textDark">{item.name}</span>
                          {item.savings > 0 ? <Pill tone="success">%{item.savingsPercent} indirim</Pill> : null}
                        </span>
                        <span className="mt-1 block text-2xl font-semibold text-textDark">
                          {formatTry(item.price)}
                          <span className="text-base font-normal text-textMuted"> / {item.months === 12 ? 'yıl' : 'ay'}</span>
                        </span>
                        {item.savings > 0 ? (
                          <span className="mt-1 block text-sm text-textMuted">
                            Ayda {formatTry(monthlyEquivalent(item))}'e gelir. 12 ay aylık alsan {formatTry(item.regularPrice)} öderdin; {formatTry(item.savings)} tasarruf.
                          </span>
                        ) : (
                          <span className="mt-1 block text-sm text-textMuted">Bir ay boyunca Premium.</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5 space-y-2.5">
              {['Oda kurma ve kameralı odalar', 'Elite oda erişimi', 'Premium profil çerçeveleri', 'Detaylı haftalık analiz'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  <p className="text-[15px] text-textDark">{item}</p>
                </div>
              ))}
            </div>

            {error ? (
              <div className="mt-5">
                <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
              </div>
            ) : null}

            <Button variant="lamp" size="lg" className="mt-6 w-full" loading={redirecting} disabled={!plan || !paymentsEnabled} onClick={() => void checkout()}>
              {!paymentsEnabled ? 'Ödeme şu an kapalı' : plan ? `${formatTry(plan.price)} öde` : 'Planlar yükleniyor'}
            </Button>
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-sunken p-3.5">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-textMuted" />
              <p className="text-sm leading-5 text-textMuted">
                Ödeme iyzico'nun güvenli sayfasında yapılır; kart bilgin StudyLounge'a ulaşmaz. Otomatik yenileme yok: süre bitince Premium kapanır, istersen yeniden alırsın.
              </p>
            </div>
          </Surface>

          {status && status.payments.length > 0 ? (
            <Surface className="p-6">
              <h2 className="text-lg font-semibold text-textDark">Ödeme geçmişi</h2>
              <ul className="mt-3 divide-y divide-border">
                {status.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center gap-3 py-2.5 text-[15px]">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-textDark">{payment.planId === 'yearly' ? 'Yıllık Premium' : 'Aylık Premium'}</span>
                      <span className="block text-sm text-textMuted">{shortDate.format(new Date(payment.createdAt))}</span>
                    </span>
                    <span className="text-textDark">{formatTry(payment.amount)}</span>
                    <Pill tone={payment.status === 'success' ? 'success' : 'danger'}>{payment.status === 'success' ? 'Ödendi' : 'Başarısız'}</Pill>
                  </li>
                ))}
              </ul>
            </Surface>
          ) : null}
        </div>
      </div>
    </div>
  );
}
