import { useEffect, useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { api } from '../../lib/api';
import type { User } from '../../lib/types';
import { Avatar } from '../ui';

type SearchResult = Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame' | 'isPremium' | 'isOnline'>;

/** Kullanıcı adı ya da ad soyadla arama; sonuçlar profil sayfasına gider. Ok tuşları, Enter ve Esc çalışır. */
export default function UserSearch({ placeholder = 'Kullanıcı ara', onPick }: { placeholder?: string; onPick?: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  // Sonuç hangi sorgu için geldiyse onunla etiketlenir; sorgu değişince eski sonuç gösterilmez.
  const [results, setResults] = useState<{ term: string; items: SearchResult[] } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const listId = useId();
  const term = query.trim();

  // Yazmayı bırakınca (300 ms) aranır; kısa sorgularda istek atılmaz.
  useEffect(() => {
    if (term.length < 2) return;
    let ignore = false;
    const timer = setTimeout(() => {
      api
        .get<SearchResult[]>('/users/search', { params: { q: term } })
        .then((response) => !ignore && setResults({ term, items: response.data }))
        .catch(() => !ignore && setResults({ term, items: [] }));
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [term]);

  const fresh = results?.term === term;
  const loading = term.length >= 2 && !fresh;
  const visible = term.length >= 2 && fresh ? results.items : [];
  const open = term.length >= 2 && !loading && !dismissed;
  const optionId = (index: number) => `${listId}-opt-${index}`;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setDismissed(true);
      setActiveIndex(-1);
      return;
    }
    if (!open || visible.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % visible.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? visible.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      onPick?.();
      navigate(`/app/u/${visible[activeIndex].id}`);
    }
  };

  return (
    <div className="relative">
      <label className="flex min-h-11 items-center gap-2.5 rounded-[12px] border border-mb-field bg-mb-surface px-3.5 focus-within:border-mb-action focus-within:bg-mb-card">
        {loading ? <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-mb-body" /> : <Search className="h-[18px] w-[18px] shrink-0 text-mb-body" />}
        <span className="sr-only">{placeholder}</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setDismissed(false);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          className="w-full bg-transparent text-base text-mb-ink outline-none"
        />
      </label>
      <p className="sr-only" role="status">
        {open ? (visible.length ? `${visible.length} sonuç` : 'Sonuç yok') : ''}
      </p>
      {open ? (
        <ul id={listId} role="listbox" aria-label="Arama sonuçları" className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-[12px] border border-mb-line bg-mb-card p-1 shadow-mb-raised">
          {visible.length === 0 ? <li role="presentation" className="px-3 py-2.5 text-[15px] text-mb-body">"{term}" ile eşleşen kimse yok.</li> : null}
          {visible.map((user, index) => (
            <li key={user.id} id={optionId(index)} role="option" aria-selected={index === activeIndex}>
              <Link
                to={`/app/u/${user.id}`}
                onClick={onPick}
                tabIndex={-1}
                className={`flex items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-mb-surface ${index === activeIndex ? 'bg-mb-surface' : ''}`}
              >
                <Avatar name={user.fullName} image={user.avatarUrl} frame={user.equippedProfileFrame} premium={user.isPremium} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-mb-ink">{user.fullName}</span>
                  <span className="block truncate text-sm text-mb-body">@{user.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
