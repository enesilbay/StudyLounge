import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { api } from '../../lib/api';
import type { User } from '../../lib/types';
import { Avatar } from '../ui';

type SearchResult = Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame' | 'isPremium' | 'isOnline'>;

/** Kullanıcı adı ya da ad soyadla arama; sonuçlar profil sayfasına gider. */
export default function UserSearch({ placeholder = 'Kullanıcı ara', onPick }: { placeholder?: string; onPick?: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const term = query.trim();

  // Yazmayı bırakınca (300 ms) aranır; kısa sorgularda istek atılmaz.
  useEffect(() => {
    if (term.length < 2) return;
    let ignore = false;
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .get<SearchResult[]>('/users/search', { params: { q: term } })
        .then((response) => !ignore && setResults(response.data))
        .catch(() => !ignore && setResults([]))
        .finally(() => !ignore && setLoading(false));
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [term]);

  const visible = term.length >= 2 ? results : [];

  return (
    <div className="relative">
      <label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 focus-within:border-accent">
        {loading ? <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-textMuted" /> : <Search className="h-[18px] w-[18px] shrink-0 text-textMuted" />}
        <span className="sr-only">{placeholder}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-controls={listId}
          className="w-full bg-transparent text-base text-textDark outline-none"
        />
      </label>
      {term.length >= 2 && !loading ? (
        <ul id={listId} className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
          {visible.length === 0 ? <li className="px-3 py-2.5 text-[15px] text-textMuted">"{term}" ile eşleşen kimse yok.</li> : null}
          {visible.map((user) => (
            <li key={user.id}>
              <Link to={`/app/u/${user.id}`} onClick={onPick} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sunken">
                <Avatar name={user.fullName} image={user.avatarUrl} frame={user.equippedProfileFrame} premium={user.isPremium} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-textDark">{user.fullName}</span>
                  <span className="block truncate text-sm text-textMuted">@{user.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
