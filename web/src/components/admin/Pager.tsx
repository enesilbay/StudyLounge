import { ChevronLeft, ChevronRight } from 'lucide-react';
import { numberFormatter, type Paged } from '../../lib/admin';
import { Button } from '../ui';
import { lastPageOf } from './pagedList';

/** Yönetim listelerinin altındaki sayfalayıcı: aralık özeti + Önceki / Sonraki. */
export function Pager<T>({ data, page, onPage }: { data: Paged<T>; page: number; onPage: (page: number) => void }) {
  const last = lastPageOf(data.total, data.pageSize);
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);
  return (
    <nav aria-label="Sayfalar" className="mt-4 flex items-center justify-between gap-3 text-sm text-mb-body">
      <span className="tabular-nums">
        {numberFormatter.format(from)}–{numberFormatter.format(to)} / {numberFormatter.format(data.total)}
      </span>
      <span className="flex gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Önceki
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= last} onClick={() => onPage(page + 1)}>
          Sonraki
          <ChevronRight className="h-4 w-4" />
        </Button>
      </span>
    </nav>
  );
}
