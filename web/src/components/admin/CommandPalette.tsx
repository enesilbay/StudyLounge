import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import { api } from '../../lib/api';
import type { AdminUserRow, Paged } from '../../lib/admin';
import { Avatar } from '../ui';

export interface PaletteLink {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface Result {
  key: string;
  label: string;
  hint: string;
  path: string;
  icon?: LucideIcon;
  user?: AdminUserRow;
}

/**
 * Ctrl+K: yönetim sayfaları ve kullanıcılar arasında hızlı geçiş.
 * Yukarı/aşağı ok ile seçilir, Enter ile açılır, Esc kapatır.
 */
export function CommandPalette({ open, onClose, links }: { open: boolean; onClose: () => void; links: PaletteLink[] }) {
  // Her açılışta boş başlasın diye içerik yalnızca açıkken bağlanır.
  return open ? <PaletteBody onClose={onClose} links={links} /> : null;
}

function PaletteBody({ onClose, links }: { onClose: () => void; links: PaletteLink[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ term: string; users: AdminUserRow[] }>({ term: '', users: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const term = query.trim();
  // Yalnızca güncel aramanın sonucu gösterilir.
  const users = useMemo(() => (term.length >= 2 && found.term === term ? found.users : []), [found, term]);
  const searching = term.length >= 2 && found.term !== term;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Kullanıcı araması: 2 karakterden sonra, yazmayı 200 ms bekleyerek.
  useEffect(() => {
    if (term.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api
        .get<Paged<AdminUserRow>>('/admin/users', { params: { q: term, pageSize: 6 } })
        .then((response) => {
          if (!cancelled) setFound({ term, users: response.data.items });
        })
        .catch(() => {
          if (!cancelled) setFound({ term, users: [] });
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term]);

  const results = useMemo<Result[]>(() => {
    const lower = term.toLocaleLowerCase('tr-TR');
    const pages = links
      .filter((link) => !lower || link.label.toLocaleLowerCase('tr-TR').includes(lower))
      .map((link) => ({ key: `page-${link.path}`, label: link.label, hint: 'Sayfa', path: link.path, icon: link.icon }));
    const people = users.map((user) => ({ key: `user-${user.id}`, label: user.fullName, hint: `@${user.username}`, path: `/admin/users/${user.id}`, user }));
    return [...people, ...pages];
  }, [links, term, users]);

  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  const go = (result: Result | undefined) => {
    if (!result) return;
    onClose();
    navigate(result.path);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((activeIndex - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[activeIndex]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 px-4 pt-[12vh]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Yönetimde ara" className="sl-panel mx-auto w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-5 w-5 shrink-0 text-textMuted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[activeIndex] ? `${listId}-${results[activeIndex].key}` : undefined}
            aria-label="Yönetimde ara"
            placeholder="Kullanıcı ya da sayfa ara"
            className="min-h-14 w-full bg-transparent text-base text-textDark outline-none placeholder:text-textMuted"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-xs text-textMuted sm:block">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[15px] text-textMuted">{term.length < 2 ? 'Aramak için yaz.' : searching ? 'Aranıyor…' : 'Sonuç yok.'}</li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.key}
                id={`${listId}-${result.key}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(result)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${index === activeIndex ? 'bg-softIndigo' : ''}`}
              >
                {result.user ? (
                  <Avatar name={result.user.fullName} image={result.user.avatarUrl} size="xs" />
                ) : result.icon ? (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-sunken text-textMuted">
                    <result.icon className="h-4 w-4" />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-textDark">{result.label}</span>
                  <span className="block truncate text-sm text-textMuted">{result.hint}</span>
                </span>
                {index === activeIndex ? <CornerDownLeft className="h-4 w-4 text-textMuted" aria-hidden="true" /> : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
