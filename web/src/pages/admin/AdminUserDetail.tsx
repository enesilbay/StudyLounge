import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { Ban, BadgeCheck, Crown, ExternalLink, MicOff, ShieldCheck, Trash2, Undo2, UserRound, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { REPORT_REASON_LABELS } from '../../lib/moderation';
import { ACTION_LABELS, dateFormatter, dateTimeFormatter, formatMinutes, numberFormatter, parseDay, timeAgo, userBadges } from '../../lib/admin';
import type { AdminUserDetail as Detail } from '../../lib/admin';
import { useAuthStore } from '../../store/authStore';
import { Avatar, Button, Notice, Pill, StateBlock } from '../../components/ui';
import { UserActionDialog } from '../../components/admin/UserActionDialog';
import { banConfig, deleteConfig, muteConfig, premiumConfig, revokeConfig, roleConfig, unbanConfig, unmuteConfig, verifyConfig, type WithDone } from '../../components/admin/userActions';
import type { UsersOutletContext } from './AdminUsersPage';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const dayShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

/** Kullanıcı ayrıntısı: listenin sağında açılan panel (telefonda tam ekran). */
export default function AdminUserDetail() {
  const { userId } = useParams();
  const id = Number(userId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reloadList } = useOutletContext<UsersOutletContext>();
  const me = useAuthStore((state) => state.user);
  // Yanıtlar ve bildirim hangi kullanıcıya aitse onunla saklanır; başka kişiye geçince eskisi görünmez.
  const [loaded, setLoaded] = useState<{ id: number; data: Detail | null; error: string | null } | null>(null);
  const [noticeFor, setNoticeFor] = useState<{ id: number; text: string } | null>(null);
  const [dialog, setDialog] = useState<WithDone | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const data = loaded?.id === id ? loaded.data : null;
  const error = loaded?.id === id ? loaded.error : null;
  const notice = noticeFor?.id === id ? noticeFor.text : null;
  const setNotice = (text: string | null) => setNoticeFor(text ? { id, text } : null);

  const listHref = `/admin/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const close = useCallback(() => navigate(listHref), [navigate, listHref]);

  const load = useCallback(async () => {
    try {
      const response = await api.get<Detail>(`/admin/users/${id}`);
      setLoaded({ id, data: response.data, error: null });
    } catch (loadError) {
      setLoaded({ id, data: null, error: getApiErrorMessage(loadError) });
    }
  }, [id]);

  // Odak tuzağı (ModalShell kalıbı): Tab panelin içinde döner, odak dışarı kaçarsa içeri alınır, kapanınca açan öğeye döner.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Detail>(`/admin/users/${id}`)
      .then((response) => {
        if (!cancelled) setLoaded({ id, data: response.data, error: null });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setLoaded({ id, data: null, error: getApiErrorMessage(loadError) });
      });
    closeRef.current?.focus();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (dialog) return; // iletişim kutusu açıkken ModalShell odağı yönetir
    const panel = panelRef.current;
    if (!panel) return;
    const items = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden], [inert]'));
    // Genel arama gibi panelin dışındaki açık pencerelere dokunma.
    const inOtherDialog = (node: EventTarget | null) => node instanceof Element && node.closest('[role="dialog"]') !== null && !panel.contains(node);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || inOtherDialog(document.activeElement)) return;
      const list = items();
      if (list.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target) && !inOtherDialog(event.target)) (items()[0] ?? panel).focus();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [dialog]);

  useEffect(() => {
    if (dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, dialog]);

  const done = (message: string) => () => {
    setDialog(null);
    setNotice(message);
    void load();
    reloadList();
  };

  const user = data?.user;
  const isSelf = user?.id === me?.id;
  const targetIsAdmin = user?.role === 'admin';
  const muted = Boolean(user?.mutedUntil && new Date(user.mutedUntil) > new Date());
  const restricted = isSelf || targetIsAdmin; // susturma, yasak ve silme kapalı

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Ayrıntıyı kapat" tabIndex={-1} onClick={close} className="absolute inset-0 hidden bg-mb-solid/40 md:block" />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={user ? `${user.fullName} ayrıntısı` : 'Kullanıcı ayrıntısı'}
        className="relative flex h-full w-full flex-col overflow-y-auto border-l border-mb-line bg-mb-bg shadow-mb-raised outline-none md:max-w-[580px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-mb-line bg-mb-bg/95 px-5 py-3 backdrop-blur">
          <span className="text-sm font-semibold text-mb-body">Kullanıcı</span>
          <button ref={closeRef} type="button" onClick={close} aria-label="Kapat" className="grid h-10 w-10 place-items-center rounded-lg text-mb-body hover:bg-mb-surface hover:text-mb-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-5 py-5">
          {error ? (
            <StateBlock title="Bu hesap açılamadı" description={error} action={<Button variant="secondary" size="sm" onClick={close}>Listeye dön</Button>} />
          ) : null}
          {!data && !error ? <StateBlock loading title="Yükleniyor" /> : null}

          {data && user ? (
            <>
              <header className="flex items-start gap-4">
                <Avatar name={user.fullName} image={user.avatarUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl text-mb-ink">{user.fullName}</h2>
                  <p className="truncate text-mb-body">@{user.username}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {userBadges(user).map((badge) => (
                      <Pill key={badge.label} tone={badge.tone}>{badge.label}</Pill>
                    ))}
                    {user.isOnline ? <Pill tone="success">Çevrimiçi{user.currentRoom ? ` · ${user.currentRoom}` : ''}</Pill> : null}
                  </div>
                </div>
                <Link to={`/app/u/${user.id}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-mb-body underline-offset-2 hover:text-mb-ink hover:underline">
                  Profil
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </header>

              {notice ? <Notice tone="success" onDismiss={() => setNotice(null)}>{notice}</Notice> : null}

              <Section title="Hesap">
                <Facts
                  items={[
                    ['E-posta', <span className="break-all">{user.email}</span>],
                    ['Giriş yöntemi', user.google ? 'Google' : 'E-posta ve şifre'],
                    ['Kayıt', dateFormatter.format(new Date(user.createdAt))],
                    ['Son görülme', user.lastSeenAt ? `${timeAgo(user.lastSeenAt)}` : 'Kayıt yok'],
                    ['Rol', user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'],
                    ['E-posta doğrulama', user.isEmailVerified ? 'Doğrulandı' : 'Bekliyor'],
                    ['Premium', user.isPremium ? (user.premiumUntil ? `${dateFormatter.format(new Date(user.premiumUntil))} tarihine kadar` : 'Süresiz') : 'Yok'],
                    ['Susturma', muted && user.mutedUntil ? `${dateTimeFormatter.format(new Date(user.mutedUntil))} tarihine kadar` : 'Yok'],
                    ['Yasak', user.bannedAt ? dateTimeFormatter.format(new Date(user.bannedAt)) : 'Yok'],
                  ]}
                />
              </Section>

              <Section title="Aktivite" aside={`Seri ${user.currentStreak} gün · en iyi ${user.bestStreak}`}>
                <FocusBars days={data.focusDaily} />
                <p className="mt-3 text-sm text-mb-body">
                  Toplam <span className="font-semibold text-mb-ink">{formatMinutes(user.totalFocusMinutes)}</span>
                  {' · '}son odak {timeAgo(user.lastFocusAt)}
                </p>
                {data.recentSessions.length ? (
                  <ul className="mt-3 divide-y divide-mb-line rounded-lg border border-mb-line">
                    {data.recentSessions.map((session) => (
                      <li key={session.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-mb-ink">
                          {session.subject ?? 'Derssiz'}
                          {session.roomName ? <span className="text-mb-body"> · {session.roomName}</span> : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-mb-body">
                          {formatMinutes(session.minutes)} · {timeAgo(session.endedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Section>

              <Section title="Şikayetler" aside={`Hakkında ${data.reports.against}${data.reports.againstOpen ? ` (${data.reports.againstOpen} açık)` : ''} · yaptığı ${data.reports.filed}`}>
                {data.reports.recent.length ? (
                  <ul className="space-y-2">
                    {data.reports.recent.map((report) => (
                      <li key={report.id} className="rounded-lg bg-mb-surface px-3 py-2 text-sm">
                        <span className="flex flex-wrap items-center gap-2">
                          <Pill tone={report.status === 'open' ? 'danger' : 'neutral'}>{REPORT_REASON_LABELS[report.reason as keyof typeof REPORT_REASON_LABELS] ?? report.reason}</Pill>
                          <span className="text-mb-body">
                            {report.reporterUsername ? `@${report.reporterUsername}` : 'Silinmiş hesap'} · {timeAgo(report.createdAt)}
                          </span>
                        </span>
                        {report.messageText || report.details ? <p className="mt-1 line-clamp-2 text-mb-ink">{report.messageText ?? report.details}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mb-body">Hakkında şikayet yok.</p>
                )}
              </Section>

              <Section title="Ödemeler">
                {data.payments.length ? (
                  <ul className="divide-y divide-mb-line rounded-lg border border-mb-line text-sm">
                    {data.payments.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-mb-ink">
                          {payment.planId === 'yearly' ? 'Yıllık' : payment.planId === 'monthly' ? 'Aylık' : payment.planId} · {numberFormatter.format(Number(payment.amount))} {payment.currency === 'TRY' ? '₺' : payment.currency}
                        </span>
                        <span className="flex items-center gap-2 text-mb-body">
                          <Pill tone={payment.status === 'success' ? 'success' : payment.status === 'failed' ? 'danger' : 'neutral'}>
                            {payment.status === 'success' ? 'Başarılı' : payment.status === 'failed' ? 'Başarısız' : 'Beklemede'}
                          </Pill>
                          {dateFormatter.format(new Date(payment.createdAt))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mb-body">Ödeme yok.</p>
                )}
              </Section>

              <Section title="İşlem kaydı" aside={data.actions.length ? <Link to={`/admin/actions?targetId=${user.id}`} className="font-semibold text-mb-action underline-offset-2 hover:underline">Tümü</Link> : undefined}>
                {data.actions.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {data.actions.map((action) => (
                      <li key={action.id} className="flex flex-wrap items-baseline gap-x-2">
                        <Pill tone={ACTION_LABELS[action.action]?.tone ?? 'neutral'}>{ACTION_LABELS[action.action]?.label ?? action.action}</Pill>
                        <span className="text-mb-body">
                          {action.admin ? `@${action.admin.username}` : action.adminLabel ? `@${action.adminLabel} (silindi)` : 'Bilinmeyen yönetici'} · {timeAgo(action.createdAt)}
                        </span>
                        {action.reason ? <span className="basis-full pl-1 text-mb-ink">“{action.reason}”</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mb-body">Bu kullanıcıyla ilgili işlem yok.</p>
                )}
              </Section>

              <Section title="İşlemler">
                <div className="flex flex-wrap gap-2">
                  {!restricted ? (
                    muted ? (
                      <Button size="sm" variant="secondary" icon={Undo2} onClick={() => setDialog(unmuteConfig(user.id, done('Susturma kaldırıldı.')))}>
                        Susturmayı kaldır
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" icon={MicOff} onClick={() => setDialog(muteConfig(user.id, done('Kullanıcı susturuldu.')))}>
                        Sustur
                      </Button>
                    )
                  ) : null}
                  {!user.isEmailVerified ? (
                    <Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => setDialog(verifyConfig(user.id, done('E-posta doğrulanmış sayıldı.')))}>
                      E-postayı doğrulanmış say
                    </Button>
                  ) : null}
                  {user.isPremium && !user.premiumUntil ? null : (
                    <Button size="sm" variant="secondary" icon={Crown} onClick={() => setDialog(premiumConfig(user.id, user.isPremium, done('Premium verildi.')))}>
                      {user.isPremium ? 'Premium süresini uzat' : 'Premium ver'}
                    </Button>
                  )}
                  {user.isPremium ? (
                    <Button size="sm" variant="ghost" icon={Undo2} onClick={() => setDialog(revokeConfig(user.id, done('Premium geri alındı.')))}>
                      Premium'u geri al
                    </Button>
                  ) : null}
                </div>

                {isSelf ? (
                  <p className="mt-4 text-sm text-mb-body">Bu senin hesabın. Rol, susturma, yasak ve silme işlemleri kendine uygulanamaz.</p>
                ) : (
                  <div className="mt-5 rounded-xl border border-mb-live/40 p-4">
                    <h4 className="text-[15px] font-semibold text-mb-live-ink">Tehlikeli bölge</h4>
                    {targetIsAdmin ? (
                      <p className="mt-1 text-sm text-mb-body">Yöneticiye susturma, yasak ve silme uygulanamaz; önce rolünü kullanıcıya çevir.</p>
                    ) : null}
                    {!targetIsAdmin && user.bannedAt ? (
                      <p className="mt-1 text-sm text-mb-body">Yasaklı hesap yönetici yapılamaz; önce yasağı kaldır.</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!targetIsAdmin ? (
                        user.bannedAt ? (
                          <Button size="sm" variant="secondary" icon={Undo2} onClick={() => setDialog(unbanConfig(user.id, done('Yasak kaldırıldı.')))}>
                            Yasağı kaldır
                          </Button>
                        ) : (
                          <Button size="sm" variant="danger" icon={Ban} onClick={() => setDialog(banConfig(user.id, user.username, done('Hesap askıya alındı.')))}>
                            Yasakla
                          </Button>
                        )
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={targetIsAdmin ? UserRound : ShieldCheck}
                        disabled={!targetIsAdmin && Boolean(user.bannedAt)}
                        onClick={() => setDialog(roleConfig(user.id, user.username, targetIsAdmin ? 'user' : 'admin', done('Rol değişti.')))}
                      >
                        {targetIsAdmin ? 'Kullanıcıya çevir' : 'Yönetici yap'}
                      </Button>
                      {!targetIsAdmin ? (
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() =>
                            setDialog(
                              deleteConfig(user.id, user.username, () => {
                                setDialog(null);
                                reloadList();
                                navigate(listHref, { state: { notice: `@${user.username} hesabı silindi.` } });
                              }),
                            )
                          }
                        >
                          Hesabı sil
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </Section>
            </>
          ) : null}
        </div>
      </aside>

      {dialog ? <UserActionDialog config={dialog} onClose={() => setDialog(null)} onDone={dialog.onDone} /> : null}
    </div>
  );
}

/* ───────────────────────── Küçük parçalar ───────────────────────── */

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-lg text-mb-ink">{title}</h3>
        {aside ? <span className="text-sm text-mb-body">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-mb-line bg-mb-card p-4 text-[15px] sm:gap-x-6">
      {items.map(([label, value]) => (
        <div key={label} className={`min-w-0 ${label === 'E-posta' ? 'col-span-2 sm:col-span-1' : ''}`}>
          <dt className="text-sm text-mb-body">{label}</dt>
          <dd className="text-mb-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Son 30 günün odak süresi; ince çubuklar, üzerine gelince gün ve süre. */
function FocusBars({ days }: { days: { date: string; minutes: number }[] }) {
  const max = Math.max(1, ...days.map((day) => day.minutes));
  const total = days.reduce((sum, day) => sum + day.minutes, 0);
  if (!total) return <p className="rounded-lg bg-mb-surface px-3 py-4 text-sm text-mb-body">Son 30 günde odak oturumu yok.</p>;
  return (
    <div>
      <div className="flex h-16 items-end gap-[3px] rounded-lg bg-mb-surface px-2 pt-2" role="img" aria-label={`Son 30 günde ${formatMinutes(total)} odak`}>
        {days.map((day) => (
          <span
            key={day.date}
            title={`${dayShort.format(parseDay(day.date))}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}
            className={`block flex-1 rounded-t-sm ${day.minutes ? 'bg-mb-action' : 'bg-transparent'}`}
            style={{ height: `${day.minutes ? Math.max(6, (day.minutes / max) * 100) : 0}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-mb-body" aria-hidden="true">
        <span>{days[0] ? dayShort.format(parseDay(days[0].date)) : ''}</span>
        <span>Bugün</span>
      </div>
    </div>
  );
}
