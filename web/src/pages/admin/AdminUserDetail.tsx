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
import { UserActionDialog, type UserActionConfig } from '../../components/admin/UserActionDialog';
import type { UsersOutletContext } from './AdminUsersPage';

const dayShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

/** API hatasını iletişim kutusunda gösterilecek mesaja çevirir. */
async function call(request: () => Promise<unknown>) {
  try {
    await request();
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

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
      <button type="button" aria-label="Ayrıntıyı kapat" tabIndex={-1} onClick={close} className="absolute inset-0 hidden bg-black/30 md:block" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={user ? `${user.fullName} ayrıntısı` : 'Kullanıcı ayrıntısı'}
        className="relative flex h-full w-full flex-col overflow-y-auto border-l border-border bg-background shadow-[-12px_0_32px_-12px_rgba(0,0,0,0.25)] md:max-w-[580px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <span className="text-sm font-semibold text-textMuted">Kullanıcı</span>
          <button ref={closeRef} type="button" onClick={close} aria-label="Kapat" className="grid h-10 w-10 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-textDark">
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
                  <h2 className="truncate text-2xl text-textDark">{user.fullName}</h2>
                  <p className="truncate text-textMuted">@{user.username}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {userBadges(user).map((badge) => (
                      <Pill key={badge.label} tone={badge.tone}>{badge.label}</Pill>
                    ))}
                    {user.isOnline ? <Pill tone="success">Çevrimiçi{user.currentRoom ? ` · ${user.currentRoom}` : ''}</Pill> : null}
                  </div>
                </div>
                <Link to={`/app/u/${user.id}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-textMuted underline-offset-2 hover:text-textDark hover:underline">
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
                <p className="mt-3 text-sm text-textMuted">
                  Toplam <span className="font-semibold text-textDark">{formatMinutes(user.totalFocusMinutes)}</span>
                  {' · '}son odak {timeAgo(user.lastFocusAt)}
                  {user.dailyGoalMinutes ? ` · günlük hedef ${formatMinutes(user.dailyGoalMinutes)}` : ''}
                </p>
                {data.recentSessions.length ? (
                  <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {data.recentSessions.map((session) => (
                      <li key={session.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-textDark">
                          {session.subject ?? 'Derssiz'}
                          {session.roomName ? <span className="text-textMuted"> · {session.roomName}</span> : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-textMuted">
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
                      <li key={report.id} className="rounded-lg bg-sunken px-3 py-2 text-sm">
                        <span className="flex flex-wrap items-center gap-2">
                          <Pill tone={report.status === 'open' ? 'danger' : 'neutral'}>{REPORT_REASON_LABELS[report.reason as keyof typeof REPORT_REASON_LABELS] ?? report.reason}</Pill>
                          <span className="text-textMuted">
                            {report.reporterUsername ? `@${report.reporterUsername}` : 'Silinmiş hesap'} · {timeAgo(report.createdAt)}
                          </span>
                        </span>
                        {report.messageText || report.details ? <p className="mt-1 line-clamp-2 text-textDark">{report.messageText ?? report.details}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-textMuted">Hakkında şikayet yok.</p>
                )}
              </Section>

              <Section title="Ödemeler">
                {data.payments.length ? (
                  <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                    {data.payments.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-textDark">
                          {payment.planId === 'yearly' ? 'Yıllık' : payment.planId === 'monthly' ? 'Aylık' : payment.planId} · {numberFormatter.format(Number(payment.amount))} {payment.currency === 'TRY' ? '₺' : payment.currency}
                        </span>
                        <span className="flex items-center gap-2 text-textMuted">
                          <Pill tone={payment.status === 'success' ? 'success' : payment.status === 'failed' ? 'danger' : 'neutral'}>
                            {payment.status === 'success' ? 'Başarılı' : payment.status === 'failed' ? 'Başarısız' : 'Beklemede'}
                          </Pill>
                          {dateFormatter.format(new Date(payment.createdAt))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-textMuted">Ödeme yok.</p>
                )}
              </Section>

              <Section title="İşlem kaydı" aside={data.actions.length ? <Link to={`/admin/actions?targetId=${user.id}`} className="font-semibold text-primary underline-offset-2 hover:underline">Tümü</Link> : undefined}>
                {data.actions.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {data.actions.map((action) => (
                      <li key={action.id} className="flex flex-wrap items-baseline gap-x-2">
                        <Pill tone={ACTION_LABELS[action.action]?.tone ?? 'neutral'}>{ACTION_LABELS[action.action]?.label ?? action.action}</Pill>
                        <span className="text-textMuted">
                          {action.admin ? `@${action.admin.username}` : action.adminLabel ? `@${action.adminLabel} (silindi)` : 'Bilinmeyen yönetici'} · {timeAgo(action.createdAt)}
                        </span>
                        {action.reason ? <span className="basis-full pl-1 text-textDark">“{action.reason}”</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-textMuted">Bu kullanıcıyla ilgili işlem yok.</p>
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
                  <p className="mt-4 text-sm text-textMuted">Bu senin hesabın. Rol, susturma, yasak ve silme işlemleri kendine uygulanamaz.</p>
                ) : (
                  <div className="mt-5 rounded-xl border border-danger/40 p-4">
                    <h4 className="text-[15px] font-semibold text-danger">Tehlikeli bölge</h4>
                    {targetIsAdmin ? (
                      <p className="mt-1 text-sm text-textMuted">Yöneticiye susturma, yasak ve silme uygulanamaz; önce rolünü kullanıcıya çevir.</p>
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

/* ───────────────────────── İşlem tanımları ───────────────────────── */

/** İşlem tanımı + başarıdan sonra ne olacağı. */
type WithDone = UserActionConfig & { onDone: () => void };

function muteConfig(id: number, onDone: () => void): WithDone {
  return {
    title: 'Kullanıcıyı sustur',
    description: "Susturulan kişi oda sohbetine ve DM'e yazamaz; odalara girip çalışabilir.",
    confirmLabel: 'Sustur',
    choicesLabel: 'Süre',
    choices: [
      { value: '24', label: '24 saat' },
      { value: '168', label: '7 gün' },
      { value: '720', label: '30 gün' },
    ],
    run: ({ choice, reason }) => call(() => api.post(`/admin/users/${id}/mute`, { hours: Number(choice), reason: reason || undefined })),
    onDone,
  };
}

function unmuteConfig(id: number, onDone: () => void): WithDone {
  return {
    title: 'Susturmayı kaldır',
    description: 'Kullanıcı yeniden sohbete ve DM’e yazabilir.',
    confirmLabel: 'Susturmayı kaldır',
    run: ({ reason }) => call(() => api.delete(`/admin/users/${id}/mute`, { data: { reason: reason || undefined } })),
    onDone,
  };
}

function verifyConfig(id: number, onDone: () => void): WithDone {
  return {
    title: 'E-postayı doğrulanmış say',
    description: 'Doğrulama kodu ulaşmayan kullanıcı için. Kullanıcı kodu girmeden giriş yapabilir.',
    confirmLabel: 'Doğrulanmış say',
    run: ({ reason }) => call(() => api.post(`/admin/users/${id}/verify-email`, { reason: reason || undefined })),
    onDone,
  };
}

function premiumConfig(id: number, hasPremium: boolean, onDone: () => void): WithDone {
  return {
    title: hasPremium ? 'Premium süresini uzat' : 'Premium ver',
    description: hasPremium ? 'Süre, mevcut bitiş tarihinin üstüne eklenir.' : 'Destek amacıyla ücretsiz Premium. Ödeme kaydı oluşmaz.',
    confirmLabel: hasPremium ? 'Uzat' : 'Premium ver',
    choicesLabel: 'Süre',
    choices: [
      { value: 'month', label: '1 ay' },
      { value: 'year', label: '1 yıl' },
      { value: 'unlimited', label: 'Süresiz' },
    ],
    run: ({ choice, reason }) => call(() => api.post(`/admin/users/${id}/premium`, { plan: choice, reason: reason || undefined })),
    onDone,
  };
}

function revokeConfig(id: number, onDone: () => void): WithDone {
  return {
    title: "Premium'u geri al",
    description: 'Premium hemen kapanır ve kalan süre silinir. Ödeme iadesi yapılmaz.',
    confirmLabel: 'Geri al',
    run: ({ reason }) => call(() => api.post(`/admin/users/${id}/premium/revoke`, { reason: reason || undefined })),
    onDone,
  };
}

function banConfig(id: number, username: string, onDone: () => void): WithDone {
  return {
    title: `@${username} yasaklansın mı?`,
    description: 'Yasaklanan hesap giriş yapamaz, canlı bağlantısı reddedilir. Yasak sonradan kaldırılabilir.',
    confirmLabel: 'Yasakla',
    danger: true,
    reasonRequired: true,
    run: ({ reason }) => call(() => api.post(`/admin/users/${id}/ban`, { reason })),
    onDone,
  };
}

function unbanConfig(id: number, onDone: () => void): WithDone {
  return {
    title: 'Yasağı kaldır',
    description: 'Kullanıcı yeniden giriş yapabilir.',
    confirmLabel: 'Yasağı kaldır',
    run: ({ reason }) => call(() => api.delete(`/admin/users/${id}/ban`, { data: { reason: reason || undefined } })),
    onDone,
  };
}

function roleConfig(id: number, username: string, role: 'user' | 'admin', onDone: () => void): WithDone {
  return {
    title: role === 'admin' ? `@${username} yönetici olsun mu?` : `@${username} kullanıcıya çevrilsin mi?`,
    description:
      role === 'admin'
        ? 'Yönetici bu paneli açar; kullanıcıları susturabilir, yasaklayabilir, Premium verebilir ve hesap silebilir.'
        : 'Kullanıcı yönetim paneline erişimini kaybeder.',
    confirmLabel: role === 'admin' ? 'Yönetici yap' : 'Kullanıcıya çevir',
    danger: role === 'admin',
    reasonRequired: role === 'admin',
    run: ({ reason }) => call(() => api.patch(`/admin/users/${id}/role`, { role, reason: reason || undefined })),
    onDone,
  };
}

function deleteConfig(id: number, username: string, onDone: () => void): WithDone {
  return {
    title: `@${username} hesabı silinsin mi?`,
    description: 'Oturumlar, dersler, görevler, arkadaşlıklar ve özel mesajlar kalıcı olarak silinir. Geri alınamaz.',
    confirmLabel: 'Hesabı kalıcı olarak sil',
    danger: true,
    reasonRequired: true,
    confirmText: username,
    run: ({ reason, confirmation }) => call(() => api.delete(`/admin/users/${id}`, { data: { confirmation, reason } })),
    onDone,
  };
}

/* ───────────────────────── Küçük parçalar ───────────────────────── */

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-lg text-textDark">{title}</h3>
        {aside ? <span className="text-sm text-textMuted">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-border bg-surface p-4 text-[15px] sm:gap-x-6">
      {items.map(([label, value]) => (
        <div key={label} className={`min-w-0 ${label === 'E-posta' ? 'col-span-2 sm:col-span-1' : ''}`}>
          <dt className="text-sm text-textMuted">{label}</dt>
          <dd className="text-textDark">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Son 30 günün odak süresi; ince çubuklar, üzerine gelince gün ve süre. */
function FocusBars({ days }: { days: { date: string; minutes: number }[] }) {
  const max = Math.max(1, ...days.map((day) => day.minutes));
  const total = days.reduce((sum, day) => sum + day.minutes, 0);
  if (!total) return <p className="rounded-lg bg-sunken px-3 py-4 text-sm text-textMuted">Son 30 günde odak oturumu yok.</p>;
  return (
    <div>
      <div className="flex h-16 items-end gap-[3px] rounded-lg bg-sunken px-2 pt-2" role="img" aria-label={`Son 30 günde ${formatMinutes(total)} odak`}>
        {days.map((day) => (
          <span
            key={day.date}
            title={`${dayShort.format(parseDay(day.date))}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}
            className={`block flex-1 rounded-t-sm ${day.minutes ? 'bg-primary' : 'bg-transparent'}`}
            style={{ height: `${day.minutes ? Math.max(6, (day.minutes / max) * 100) : 0}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-textMuted" aria-hidden="true">
        <span>{days[0] ? dayShort.format(parseDay(days[0].date)) : ''}</span>
        <span>Bugün</span>
      </div>
    </div>
  );
}
