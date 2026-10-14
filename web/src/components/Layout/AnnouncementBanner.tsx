import { useEffect, useState } from 'react';
import { Info, Megaphone, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { ActiveAnnouncement } from '../../lib/admin';

const DISMISSED_KEY = 'sl-duyuru-kapatilan';
const REFRESH_MS = 5 * 60 * 1000;

function readDismissed(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

/** Uygulamanın üstündeki duyuru şeridi. Kapatılan duyuru bu tarayıcıda bir daha görünmez. */
export function AnnouncementBanner() {
  const [items, setItems] = useState<ActiveAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(readDismissed);

  useEffect(() => {
    let active = true;
    const load = () => {
      api
        .get<ActiveAnnouncement[]>('/announcements/active')
        .then((response) => {
          if (active) setItems(response.data);
        })
        .catch(() => {
          // Duyuru gelmezse uygulama etkilenmez; şerit sessizce görünmez.
        });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const dismiss = (id: number) => {
    const next = [...dismissed, id].slice(-50);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Depolama kapalıysa duyuru yalnızca bu oturumda kapalı kalır.
    }
  };

  const visible = items.filter((item) => !dismissed.includes(item.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-px">
      {visible.map((item) => {
        const warning = item.tone === 'warning';
        const Icon = warning ? Megaphone : Info;
        return (
          <div
            key={item.id}
            role="status"
            className={`flex items-start gap-3 border-b px-4 py-2.5 md:px-6 ${warning ? 'border-mb-lamp/60 bg-mb-lamp/20' : 'border-mb-info/30 bg-mb-info-soft'}`}
          >
            <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${warning ? 'text-mb-ink' : 'text-mb-info'}`} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[15px] leading-6 text-mb-ink">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Duyuruyu kapat"
              className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-mb-body hover:text-mb-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
