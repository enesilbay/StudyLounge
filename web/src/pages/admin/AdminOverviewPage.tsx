import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { OVERVIEW_PERIODS, TREND_SERIES, formatMinutes, numberFormatter, parseDay, useAdminPending } from '../../lib/admin';
import type { AdminOverview, Comparison, OverviewPeriod, TrendSeries } from '../../lib/admin';
import { Button, Notice, PageHeader, StateBlock, Surface } from '../../components/ui';
import { Heatmap, OnboardingFunnel, Retention, TrendChart } from '../../components/admin/OverviewCharts';

const dayShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const timeShort = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

function readPeriod(value: string | null): OverviewPeriod {
  const parsed = Number(value);
  return (OVERVIEW_PERIODS as number[]).includes(parsed) ? (parsed as OverviewPeriod) : 30;
}

/** Yönetim: uygulamanın gidişatı ve bekleyen işler. */
export default function AdminOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = readPeriod(searchParams.get('period'));
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<TrendSeries>('focusMinutes');
  const setPending = useAdminPending.setState;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<AdminOverview>('/admin/overview', { params: { period } });
      setData(response.data);
      setPending({ pending: response.data.pending });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [period, setPending]);

  useEffect(() => {
    void load();
  }, [load]);

  const choosePeriod = (next: OverviewPeriod) => {
    setSearchParams(next === 30 ? {} : { period: String(next) }, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Genel bakış"
        description={data ? `${dayShort.format(parseDay(data.from))} – bugün · Türkiye saati` : undefined}
        action={
          <>
            <div className="flex gap-1 rounded-lg bg-sunken p-1" role="radiogroup" aria-label="Dönem">
              {OVERVIEW_PERIODS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={period === option}
                  onClick={() => choosePeriod(option)}
                  className={`min-h-9 rounded-md px-3.5 text-sm font-semibold tabular-nums transition ${period === option ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
                >
                  {option} gün
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" icon={RefreshCw} loading={loading && Boolean(data)} onClick={() => void load()} title="Yenile">
              {data ? timeShort.format(new Date(data.generatedAt)) : 'Yenile'}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-5">
          <Notice tone="danger">
            Genel bakış alınamadı: {error}{' '}
            <button type="button" onClick={() => void load()} className="font-semibold text-textDark underline underline-offset-2">
              Tekrar dene
            </button>
          </Notice>
        </div>
      ) : null}

      {!data && loading ? <StateBlock loading title="Genel bakış yükleniyor" /> : null}

      {data ? (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <PendingStrip pending={data.pending} />

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-border bg-border xl:grid-cols-5">
            <Kpi label="Yeni kullanıcı" value={numberFormatter.format(data.newUsers.current)} footer={<Delta value={data.newUsers} period={period} />} note={`Toplam ${numberFormatter.format(data.totals.users)} kullanıcı`} />
            <Kpi label="Aktif kullanıcı" value={numberFormatter.format(data.activeUsers.period)} footer={<span>Bugün {numberFormatter.format(data.activeUsers.today)} kişi</span>} note="Uygulamayı açan herkes" />
            <Kpi label="Odaklanan" value={numberFormatter.format(data.focusUsers.current)} footer={<Delta value={data.focusUsers} period={period} />} note="En az bir oturum bitiren" />
            <Kpi label="Odak süresi" value={formatMinutes(data.focusMinutes.current)} footer={<Delta value={data.focusMinutes} period={period} />} note="Bitirilen oturumların toplamı" />
            <Kpi
              wide
              label="Şu an odalarda"
              value={numberFormatter.format(data.live.people)}
              footer={<span>{data.live.rooms ? `${numberFormatter.format(data.live.rooms)} odada` : 'Açık oda yok'}</span>}
              note="Anlık"
            />
          </dl>

          <Surface className="p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl text-textDark">Günlük eğilim</h2>
                <p className="text-sm tabular-nums text-textMuted">
                  Son {period} günde toplam{' '}
                  {series === 'focusMinutes'
                    ? formatMinutes(data.daily.reduce((sum, day) => sum + day.focusMinutes, 0))
                    : series === 'newUsers'
                      ? `${numberFormatter.format(data.newUsers.current)} yeni kullanıcı`
                      : `${numberFormatter.format(data.focusUsers.current)} farklı kişi`}
                </p>
              </div>
              <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-sunken p-1 sm:flex sm:w-auto" role="radiogroup" aria-label="Grafikte gösterilen">
                {TREND_SERIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="radio"
                    aria-checked={series === item.key}
                    onClick={() => setSeries(item.key)}
                    className={`min-h-9 rounded-md px-2 text-sm font-semibold transition sm:px-3 ${series === item.key ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart daily={data.daily} series={series} />
          </Surface>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <Surface className="p-5">
              <h2 className="text-xl text-textDark">Onboarding</h2>
              <p className="mb-5 text-sm text-textMuted">Son {period} günde kayıt olanlar "Masanı hazırla" adımlarında nereye kadar geldi.</p>
              <OnboardingFunnel funnel={data.funnel} />
            </Surface>
            <Surface className="p-5">
              <h2 className="text-xl text-textDark">Elde tutma</h2>
              <p className="mb-5 text-sm text-textMuted">Son 90 günde kayıt olanlardan, kayıttan en az şu kadar gün sonra yeniden odaklananlar.</p>
              <Retention retention={data.retention} />
            </Surface>
          </div>

          <Surface className="p-5">
            <h2 className="text-xl text-textDark">Yoğun saatler</h2>
            <p className="mb-5 text-sm text-textMuted">Son {period} günün odak süresi; oturumun başladığı gün ve saate göre.</p>
            <Heatmap cells={data.heatmap} />
          </Surface>

          <details className="group rounded-[14px] border border-border px-5 py-4 text-sm text-textMuted">
            <summary className="cursor-pointer font-semibold text-textDark">Bu sayılar nasıl hesaplanıyor?</summary>
            <ul className="mt-3 max-w-3xl list-disc space-y-1.5 pl-5 leading-6">
              <li>Dönem, bugün dahil son {period} takvim günüdür (Türkiye saati). Değişim oranları hemen önceki {period} günle karşılaştırılır.</li>
              <li>Aktif kullanıcı: dönem içinde uygulamayı açan (giriş yapmış olarak istek gönderen ya da canlı bağlantı kuran) kişi. Son görülme bu sürümle tutulmaya başladı; bu yüzden önceki dönemle karşılaştırılmaz.</li>
              <li>Odaklanan: dönem içinde en az bir odak oturumunu bitiren kişi.</li>
              <li>Kayıt tarihi bu sürümle tutulmaya başladı. Daha önce açılan hesaplar, sürümün yayına çıktığı gün kaydolmuş görünür; ilk günlerde yeni kullanıcı, onboarding ve elde tutma sayıları buna göre okunmalı.</li>
              <li>Şu an odalarda: çevrimiçi olup bir odada görünen kişi sayısı.</li>
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  );
}

function PendingStrip({ pending }: { pending: AdminOverview['pending'] }) {
  const items = [
    { count: pending.openReports, label: 'açık şikayet', to: '/admin/moderation?tab=reports' },
    { count: pending.openFeedback, label: 'açık geri bildirim', to: '/admin/moderation?tab=feedback' },
    { count: pending.premiumExpiringSoon, label: "Premium'u 7 gün içinde bitecek", to: null },
  ].filter((item) => item.count > 0);

  if (!items.length) {
    return (
      <p className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-5 py-3.5 text-[15px] text-textMuted">
        <CheckCircle2 className="h-[18px] w-[18px] text-success" />
        Bekleyen iş yok.
      </p>
    );
  }

  return (
    <section aria-label="Bekleyenler" className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-[14px] border border-border bg-border">
      <h2 className="flex w-full items-center bg-surface px-5 py-3.5 text-[15px] font-semibold text-textDark sm:w-auto">Bekleyenler</h2>
      {items.map((item) => {
        const content = (
          <>
            <span className="font-display text-2xl tabular-nums text-textDark">{numberFormatter.format(item.count)}</span>
            <span className="text-[15px] text-textMuted">{item.label}</span>
            {item.to ? <ArrowRight className="ml-auto h-4 w-4 text-textMuted transition group-hover:translate-x-0.5 group-hover:text-primary" /> : null}
          </>
        );
        return item.to ? (
          <Link key={item.label} to={item.to} className="group flex min-w-56 flex-1 items-center gap-2.5 bg-surface px-5 py-3 transition hover:bg-sunken">
            {content}
          </Link>
        ) : (
          <div key={item.label} className="flex min-w-56 flex-1 items-center gap-2.5 bg-surface px-5 py-3">
            {content}
          </div>
        );
      })}
    </section>
  );
}

function Kpi({ label, value, footer, note, wide = false }: { label: string; value: string; footer: React.ReactNode; note: string; wide?: boolean }) {
  return (
    <div className={`bg-surface px-4 py-4 sm:px-5 ${wide ? 'col-span-2 xl:col-span-1' : ''}`}>
      <dt className="text-sm font-semibold text-textMuted" title={note}>
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl tabular-nums text-textDark sm:text-3xl">{value}</dd>
      <dd className="mt-1 text-sm text-textMuted">{footer}</dd>
    </div>
  );
}

/** Önceki aynı uzunluktaki döneme göre değişim. Önceki dönem boşsa yüzde uydurulmaz. */
function Delta({ value, period }: { value: Comparison; period: OverviewPeriod }) {
  const { current, previous } = value;
  if (!previous) {
    return <span>{current ? `Önceki ${period} günde yoktu` : 'Bu dönemde yok'}</span>;
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <Minus className="h-3.5 w-3.5" /> Önceki {period} günle aynı
      </span>
    );
  }
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${up ? 'text-success' : 'text-danger'}`}>
        <Icon className="h-3.5 w-3.5" />
        {up ? '+' : '−'}
        {numberFormatter.format(Math.abs(change))}%
      </span>
      önceki {period} güne göre
    </span>
  );
}
