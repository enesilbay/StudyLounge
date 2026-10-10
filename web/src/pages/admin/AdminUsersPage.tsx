import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { USER_FILTERS, USER_SORTS, dateFormatter, formatMinutes, numberFormatter, timeAgo, userBadges } from '../../lib/admin';
import type { AdminUserRow, Paged, UserFilter, UserSort } from '../../lib/admin';
import { Avatar, Button, Notice, PageHeader, Pill, StateBlock } from '../../components/ui';

const PAGE_SIZE = 25;

export interface UsersOutletContext {
  /** Ayrıntıda bir işlem yapılınca listeyi tazeler. */
  reloadList: () => void;
}

function readFilters(value: string | null): UserFilter[] {
  const allowed = new Set(USER_FILTERS.map((item) => item.key));
  return (value ?? '').split(',').filter((item): item is UserFilter => allowed.has(item as UserFilter));
}

/** Yönetim: kullanıcı arama, filtre, sıralama; satıra tıklayınca ayrıntı sağda açılır. */
export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') ?? '';
  const filters = readFilters(searchParams.get('filters'));
  const sort = (USER_SORTS.some((item) => item.key === searchParams.get('sort')) ? searchParams.get('sort') : 'createdAt') as UserSort;
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const filtersKey = filters.join(',');

  const [draft, setDraft] = useState(q);
  const [data, setData] = useState<Paged<AdminUserRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // Ayrıntıdan hesap silinince listeye gelen bildirim.
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);

  const params = useMemo(
    () => ({ q: q || undefined, filters: filtersKey || undefined, sort, order, page, pageSize: PAGE_SIZE }),
    [q, filtersKey, sort, order, page],
  );

  /** Liste parametrelerini adreste günceller; sayfa numarası değişmiyorsa başa döner. */
  const update = useCallback(
    (changes: Record<string, string | null>, keepPage = false) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!keepPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Yazarken 300 ms bekleyip aramayı adrese yazar.
  useEffect(() => {
    if (draft.trim() === q) return;
    const timer = window.setTimeout(() => update({ q: draft.trim() || null }), 300);
    return () => window.clearTimeout(timer);
  }, [draft, q, update]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Paged<AdminUserRow>>('/admin/users', { params });
      setData(response.data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFilter = (key: UserFilter) => {
    const next = filters.includes(key) ? filters.filter((item) => item !== key) : [...filters, key];
    update({ filters: next.join(',') || null });
  };

  const clearAll = () => {
    setDraft('');
    update({ q: null, filters: null });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await api.get<Blob>('/admin/users/export', { params: { ...params, page: undefined, pageSize: undefined }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studylounge-kullanicilar-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(getApiErrorMessage(exportError));
    } finally {
      setExporting(false);
    }
  };

  const listQuery = searchParams.toString();
  const detailHref = (id: number) => `/admin/users/${id}${listQuery ? `?${listQuery}` : ''}`;
  const hasCriteria = Boolean(q || filters.length);
  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Kullanıcılar"
        description={data ? `${numberFormatter.format(data.total)} kullanıcı${hasCriteria ? ' bu aramada' : ''}` : undefined}
        action={
          <Button variant="secondary" size="sm" icon={Download} loading={exporting} disabled={!data?.total} onClick={() => void exportCsv()}>
            CSV indir
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Kullanıcı ara</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-textMuted" />
          <input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ad, kullanıcı adı ya da e-posta"
            className="min-h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3.5 text-base text-textDark outline-none transition placeholder:text-textMuted focus:border-primary"
          />
        </label>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="admin-users-sort">Sırala</label>
          <select
            id="admin-users-sort"
            value={sort}
            onChange={(event) => update({ sort: event.target.value === 'createdAt' ? null : event.target.value })}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 text-[15px] font-semibold text-textDark outline-none focus:border-primary"
          >
            {USER_SORTS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => update({ order: order === 'desc' ? 'asc' : null })}
            aria-label={order === 'desc' ? 'Azalan sırada; artana çevir' : 'Artan sırada; azalana çevir'}
            title={order === 'desc' ? 'Yeniden eskiye / çoktan aza' : 'Eskiden yeniye / azdan çoğa'}
            className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface text-textMuted transition hover:bg-sunken hover:text-textDark"
          >
            {order === 'desc' ? <ArrowDownWideNarrow className="h-[18px] w-[18px]" /> : <ArrowUpNarrowWide className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filtreler">
        {USER_FILTERS.map((item) => {
          const active = filters.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleFilter(item.key)}
              className={`min-h-9 rounded-full border px-3.5 text-sm font-semibold transition ${
                active ? 'border-primary bg-softIndigo text-textDark' : 'border-border bg-surface text-textMuted hover:text-textDark'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        {hasCriteria ? (
          <button type="button" onClick={clearAll} className="inline-flex min-h-9 items-center gap-1 px-2 text-sm font-semibold text-textMuted underline-offset-2 hover:text-textDark hover:underline">
            <X className="h-4 w-4" />
            Temizle
          </button>
        ) : null}
      </div>

      {notice ? (
        <div className="mb-4">
          <Notice tone="success" onDismiss={() => setNotice(null)}>{notice}</Notice>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4">
          <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
        </div>
      ) : null}

      {!data && loading ? <StateBlock loading title="Kullanıcılar yükleniyor" /> : null}

      {data && data.items.length === 0 ? (
        <StateBlock
          title={q ? `"${q}" için kullanıcı yok` : 'Bu filtrede kullanıcı yok'}
          description="Aramayı değiştir ya da filtreleri temizle."
          action={hasCriteria ? <Button variant="secondary" size="sm" onClick={clearAll}>Filtreleri temizle</Button> : undefined}
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {/* Geniş ekran: tablo */}
          <div className="hidden overflow-hidden rounded-[14px] border border-border bg-surface md:block">
            <table className="w-full table-fixed text-left text-[15px]">
              <thead className="border-b border-border bg-sunken text-sm text-textMuted">
                <tr>
                  <th scope="col" className="w-[34%] px-4 py-2.5 font-semibold xl:w-[26%]">Kullanıcı</th>
                  <th scope="col" className="hidden w-[22%] px-4 py-2.5 font-semibold xl:table-cell">E-posta</th>
                  <th scope="col" className="w-32 px-4 py-2.5 font-semibold">Kayıt</th>
                  <th scope="col" className="w-32 px-4 py-2.5 font-semibold">Son odak</th>
                  <th scope="col" className="w-32 px-4 py-2.5 text-right font-semibold">Toplam odak</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id} onClick={() => navigate(detailHref(user.id))} className="cursor-pointer border-b border-border last:border-0 hover:bg-sunken">
                    <td className="px-4 py-2">
                      <Link to={detailHref(user.id)} className="flex min-w-0 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-primary" onClick={(event) => event.stopPropagation()}>
                        <Avatar name={user.fullName} image={user.avatarUrl} size="xs" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-textDark">{user.fullName}</span>
                          <span className="block truncate text-sm text-textMuted">@{user.username}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden truncate px-4 py-2 text-textMuted xl:table-cell" title={user.email}>{user.email}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-textMuted" title={dateFormatter.format(new Date(user.createdAt))}>{timeAgo(user.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-textMuted">{timeAgo(user.lastFocusAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-textDark">{user.totalFocusMinutes ? formatMinutes(user.totalFocusMinutes) : '—'}</td>
                    <td className="px-4 py-2">
                      <span className="flex flex-wrap gap-1">
                        {userBadges(user).map((badge) => (
                          <Pill key={badge.label} tone={badge.tone}>{badge.label}</Pill>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dar ekran: kart listesi */}
          <ul className="space-y-2 md:hidden">
            {data.items.map((user) => (
              <li key={user.id}>
                <Link to={detailHref(user.id)} className="sl-panel flex items-center gap-3 px-4 py-3">
                  <Avatar name={user.fullName} image={user.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-textDark">{user.fullName}</span>
                    <span className="block truncate text-sm text-textMuted">@{user.username} · {user.totalFocusMinutes ? formatMinutes(user.totalFocusMinutes) : 'odak yok'}</span>
                    {userBadges(user).length ? (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {userBadges(user).map((badge) => (
                          <Pill key={badge.label} tone={badge.tone}>{badge.label}</Pill>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-textMuted" />
                </Link>
              </li>
            ))}
          </ul>

          <nav aria-label="Sayfalar" className="mt-4 flex items-center justify-between gap-3 text-sm text-textMuted">
            <span className="tabular-nums">
              {numberFormatter.format(from)}–{numberFormatter.format(to)} / {numberFormatter.format(data.total)}
            </span>
            <span className="flex gap-2">
              <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null }, true)}>
                Önceki
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => update({ page: String(page + 1) }, true)}>
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </Button>
            </span>
          </nav>
        </div>
      ) : null}

      <Outlet context={{ reloadList: () => void load() } satisfies UsersOutletContext} />
    </div>
  );
}
