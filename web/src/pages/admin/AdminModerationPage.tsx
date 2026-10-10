import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui';
import { ReportsPanel } from '../../components/admin/ReportsPanel';
import { FeedbackPanel } from '../../components/admin/FeedbackPanel';
import { useAdminPending } from '../../lib/admin';

type Tab = 'reports' | 'feedback';

const DESCRIPTIONS: Record<Tab, string> = {
  reports: "Bildirilen kullanıcıları incele. Susturulan kişi oda sohbetine ve DM'e yazamaz; yasaklanan kişi giriş yapamaz.",
  feedback: 'Kullanıcıların uygulama içinden gönderdiği hata bildirimleri ve öneriler.',
};

/** Yönetim: şikayetler ve geri bildirimler. */
export default function AdminModerationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'feedback' ? 'feedback' : 'reports';
  const pending = useAdminPending((state) => state.pending);

  const tabs: [Tab, string, number][] = [
    ['reports', 'Şikayetler', pending?.openReports ?? 0],
    ['feedback', 'Geri bildirimler', pending?.openFeedback ?? 0],
  ];

  return (
    <div>
      <PageHeader title="Moderasyon" description={DESCRIPTIONS[tab]} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Moderasyon bölümü">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setSearchParams(key === 'reports' ? {} : { tab: key }, { replace: true })}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
              tab === key ? 'bg-primary text-onPrimary hover:bg-secondary' : 'border border-border bg-surface text-textDark hover:bg-sunken'
            }`}
          >
            {label}
            {count ? <span className={`tabular-nums ${tab === key ? 'text-onPrimary/80' : 'text-textMuted'}`}>{count}</span> : null}
          </button>
        ))}
      </div>
      {tab === 'reports' ? <ReportsPanel /> : <FeedbackPanel />}
    </div>
  );
}
