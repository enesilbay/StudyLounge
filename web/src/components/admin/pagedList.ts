import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import type { Paged } from '../../lib/admin';

/** Sayfa sayısı (en az 1). */
export function lastPageOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/**
 * Liste yanıtını sayfalı biçime çevirir. Geçiş döneminde sunucu düz dizi dönebilir;
 * o durumda tüm satırlar tek sayfa sayılır.
 */
export function parsePaged<T>(data: unknown, page: number, pageSize?: number): Paged<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length, page: 1, pageSize: Math.max(data.length, pageSize ?? 1) };
  }
  if (typeof data === 'object' && data !== null && Array.isArray((data as { items?: unknown }).items)) {
    const body = data as { items: T[]; total?: unknown; page?: unknown; pageSize?: unknown };
    const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
    return {
      items: body.items,
      total: num(body.total, body.items.length),
      page: num(body.page, page),
      pageSize: Math.max(1, num(body.pageSize, pageSize ?? body.items.length)),
    };
  }
  return { items: [], total: 0, page, pageSize: pageSize ?? 1 };
}

/**
 * Sayfalı yönetim listesi: yarış korumalı (eski yanıt yenisini ezmez, eski istek iptal edilir),
 * hata boş durumdan ayrı, sayfa son sayfayı aşarsa `onOverflow(sonSayfa)` çağrılır.
 */
export function usePagedList<T>(
  path: string,
  params: Record<string, unknown>,
  page: number,
  pageSize: number | undefined,
  onOverflow?: (lastPage: number) => void,
) {
  const [data, setData] = useState<Paged<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const overflow = useRef(onOverflow);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    overflow.current = onOverflow;
  });

  const load = useCallback(async () => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const requestId = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const query = { ...(JSON.parse(paramsKey) as Record<string, unknown>), page, pageSize };
      const response = await api.get<unknown>(path, { params: query, signal: ctrl.signal });
      if (requestId !== latest.current) return;
      const paged = parsePaged<T>(response.data, page, pageSize);
      setData(paged);
      const last = lastPageOf(paged.total, paged.pageSize);
      if (page > last) overflow.current?.(last);
    } catch (loadError) {
      if (requestId !== latest.current) return;
      setData(null);
      setError(getApiErrorMessage(loadError));
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, [path, paramsKey, page, pageSize]);

  useEffect(() => {
    void load();
    return () => {
      latest.current += 1;
      controller.current?.abort();
    };
  }, [load]);

  return { data, loading, error, reload: load };
}
