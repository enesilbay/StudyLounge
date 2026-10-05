import { useEffect, useMemo, useState } from 'react';
import { Check, Coins, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import type { ShopItem, User } from '../lib/types';
import { Avatar, Button, Notice, StateBlock } from '../components/ui';
import { useAuthStore } from '../store/authStore';

type Category = 'profileFrame' | 'color' | 'icon';

/** Ürünler ve sabit renkleri; fiyat sunucudaki katalogdan gelir (bkz. backend shop-catalog.ts). */
const ITEMS: Record<Category, ShopItem[]> = {
  profileFrame: [
    { id: 'none', type: 'profileFrame', name: 'Çerçevesiz', price: 0 },
    { id: 'gold', type: 'profileFrame', name: 'Altın Halka', price: 150 },
    { id: 'emerald', type: 'profileFrame', name: 'Zümrüt Odak', price: 180 },
    { id: 'ruby', type: 'profileFrame', name: 'Yakut Seri', price: 220 },
    { id: 'cosmic', type: 'profileFrame', name: 'Kozmik Lounge', price: 320 },
  ],
  color: [
    { id: '#4F46E5', type: 'color', name: 'StudyLounge Mavisi', price: 0, color: '#4F46E5' },
    { id: '#059669', type: 'color', name: 'Zümrüt Yeşili', price: 100, color: '#059669' },
    { id: '#E11D48', type: 'color', name: 'Yakut Kırmızısı', price: 150, color: '#E11D48' },
    { id: '#D97706', type: 'color', name: 'Kehribar Sarısı', price: 150, color: '#D97706' },
    { id: '#7C3AED', type: 'color', name: 'Ametist Moru', price: 200, color: '#7C3AED' },
  ],
  icon: [
    { id: '', type: 'icon', name: 'İkonsuz', price: 0, text: '' },
    { id: '🔥', type: 'icon', name: 'Ateş', price: 50, text: '🔥' },
    { id: '⚡', type: 'icon', name: 'Yıldırım', price: 80, text: '⚡' },
    { id: '💎', type: 'icon', name: 'Elmas', price: 250, text: '💎' },
    { id: '🎓', type: 'icon', name: 'Mezuniyet', price: 300, text: '🎓' },
    { id: '🚀', type: 'icon', name: 'Roket', price: 400, text: '🚀' },
  ],
};

const CATEGORIES: [Category, string, string][] = [
  ['profileFrame', 'Profil çerçevesi', 'Avatarının etrafındaki halka; odada, sıralamada ve profilinde görünür.'],
  ['color', 'Mesaj balonu', 'Telefondaki oda sohbetinde mesajlarının rengi.'],
  ['icon', 'İsim ikonu', 'Adının yanında duran küçük işaret.'],
];

/** Odak Puanıyla görünüm satın alma. Sağdaki önizleme, seçili ürünle seni nasıl göreceklerini gösterir. */
export default function ShopPage() {
  const { user, setUser, refreshUser } = useAuthStore();
  const [category, setCategory] = useState<Category>('profileFrame');
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverPrices, setServerPrices] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    api
      .get<{ type: ShopItem['type']; id: string; price: number }[]>('/users/shop/catalog')
      .then((response) => setServerPrices(new Map(response.data.map((entry) => [`${entry.type}:${entry.id}`, entry.price]))))
      .catch(() => setServerPrices(null));
  }, []);

  const items = useMemo(
    () => ITEMS[category].map((item) => ({ ...item, price: serverPrices?.get(`${item.type}:${item.id}`) ?? item.price })),
    [category, serverPrices],
  );

  if (loading || !user) return <StateBlock loading title="Mağaza yükleniyor" />;

  const act = async (item: ShopItem) => {
    const owned = isOwned(user, item);
    if (!owned && item.price > (user.coins ?? 0)) {
      setMessage({ tone: 'danger', text: `Bunun için ${item.price - (user.coins ?? 0)} puan daha gerekiyor. Odaklandıkça puan kazanırsın.` });
      return;
    }
    setBusyKey(`${item.type}:${item.id}`);
    setMessage(null);
    try {
      if (owned) {
        const response = await api.post('/users/equip', { itemType: item.type, itemId: item.id });
        setUser(unwrapUser<User>(response.data));
        setMessage({ tone: 'success', text: `${item.name} kuşanıldı.` });
      } else {
        const response = await api.post('/users/buy', { itemType: item.type, itemId: item.id });
        setUser(unwrapUser<User>(response.data));
        setMessage({ tone: 'success', text: `${item.name} senin. Kuşanmak için tekrar seç.` });
      }
    } catch (error) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error) });
    } finally {
      setBusyKey(null);
    }
  };

  // Önizleme: seçili/üstüne gelinen ürün, diğerleri kuşanılan haliyle.
  const look = {
    frame: preview?.type === 'profileFrame' ? preview.id : user.equippedProfileFrame ?? 'none',
    bubble: preview?.type === 'color' ? preview.id : user.equippedBubbleColor ?? '#4F46E5',
    icon: preview?.type === 'icon' ? preview.id : user.equippedIcon ?? '',
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl">Mağaza</h1>
          <p className="mt-3 max-w-xl text-lg text-textMuted">Odaklandıkça kazandığın puanlarla görünümünü değiştir. Aldıkların telefonda da görünür.</p>
        </div>
        <p className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-surface px-4 py-2.5 md:self-auto">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-display text-2xl text-textDark">{user.coins ?? 0}</span>
          <span className="text-[15px] text-textMuted">Odak Puanı</span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-4 inline-flex flex-wrap rounded-lg bg-sunken p-1" role="tablist" aria-label="Ürün türü">
            {CATEGORIES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={category === key}
                onClick={() => {
                  setCategory(key);
                  setPreview(null);
                }}
                className={`min-h-10 rounded-md px-4 text-[15px] font-semibold transition ${category === key ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mb-4 text-[15px] text-textMuted">{CATEGORIES.find(([key]) => key === category)?.[2]}</p>

          {message ? (
            <div className="mb-4">
              <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>
            </div>
          ) : null}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => {
              const owned = isOwned(user, item);
              const active = isActive(user, item);
              const affordable = owned || item.price <= (user.coins ?? 0);
              const key = `${item.type}:${item.id}`;
              return (
                <li key={key}>
                  <div
                    onMouseEnter={() => setPreview(item)}
                    onFocus={() => setPreview(item)}
                    className={`flex h-full flex-col items-center rounded-xl border bg-surface p-4 text-center transition ${active ? 'border-primary' : preview?.id === item.id && preview.type === item.type ? 'border-textMuted/40' : 'border-border'}`}
                  >
                    <ItemSwatch item={item} user={user} />
                    <p className="mt-3 text-[15px] font-semibold text-textDark">{item.name}</p>
                    <p className="text-sm text-textMuted">{active ? 'Kuşanıldı' : owned ? 'Sende var' : `${item.price} puan`}</p>
                    <div className="mt-3 w-full">
                      {active ? (
                        <p className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-primary">
                          <Check className="h-4 w-4" /> Kullanılıyor
                        </p>
                      ) : (
                        <Button
                          size="sm"
                          variant={owned || !affordable ? 'secondary' : 'primary'}
                          icon={!affordable ? Lock : undefined}
                          loading={busyKey === key}
                          disabled={!affordable}
                          onClick={() => void act(item)}
                          className="w-full"
                        >
                          {owned ? 'Kuşan' : affordable ? 'Satın al' : 'Puan yetmiyor'}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start" aria-labelledby="preview-title">
          <div className="sl-panel p-5">
            <h2 id="preview-title" className="text-xl text-textDark">Odada seni böyle görürler</h2>
            <p className="mt-1 text-sm text-textMuted">{preview ? `${preview.name} önizleniyor.` : 'Bir ürünün üstüne gel ya da seç.'}</p>

            <div className="mt-5 flex items-center gap-3">
              <Avatar name={user.fullName} image={user.avatarUrl} frame={look.frame} premium={user.isPremium} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-textDark">
                  {user.fullName} {look.icon}
                </p>
                <p className="text-sm text-textMuted">@{user.username}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-lg bg-sunken p-3">
              <p className="max-w-[85%] rounded-xl rounded-bl-sm bg-surface px-3 py-2 text-[15px] text-textDark">Bu turda hangi üniteye bakıyorsun?</p>
              {/* Balon rengi kullanıcının satın aldığı renk; veri olduğu için satır içi verilir. */}
              <p className="ml-auto max-w-[85%] rounded-xl rounded-br-sm px-3 py-2 text-[15px] text-white" style={{ backgroundColor: look.bubble }}>
                Türev, 3. bölüm. Molada konuşuruz.
              </p>
            </div>
            <p className="mt-2 text-xs text-textMuted">Mesaj balonu rengi telefondaki oda sohbetinde görünür.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Ürün türüne özgü küçük önizleme: çerçeve avatarın etrafında, renk balon olarak, ikon adın yanında. */
function ItemSwatch({ item, user }: { item: ShopItem; user: User }) {
  if (item.type === 'profileFrame') {
    return <Avatar name={user.fullName} image={user.avatarUrl} frame={item.id} size="lg" />;
  }
  if (item.type === 'color') {
    return (
      <span className="grid h-16 w-full place-items-center">
        <span className="rounded-xl rounded-br-sm px-3 py-1.5 text-sm text-white" style={{ backgroundColor: item.color }}>
          Merhaba
        </span>
      </span>
    );
  }
  return (
    <span className="grid h-16 w-full place-items-center">
      <span className="text-sm font-semibold text-textDark">
        {user.fullName.split(' ')[0]} <span className="text-xl">{item.text || '—'}</span>
      </span>
    </span>
  );
}

function isOwned(user: User, item: ShopItem) {
  if (item.price === 0) return true;
  if (item.type === 'color') return user.ownedColors?.includes(item.id) ?? false;
  if (item.type === 'icon') return user.ownedIcons?.includes(item.id) ?? false;
  if (item.type === 'soundPack') return (user.ownedSoundPacks ?? ['classic']).includes(item.id);
  return (user.ownedProfileFrames ?? ['none']).includes(item.id);
}

function isActive(user: User, item: ShopItem) {
  if (item.type === 'color') return (user.equippedBubbleColor ?? '#4F46E5') === item.id;
  if (item.type === 'icon') return (user.equippedIcon ?? '') === item.id;
  if (item.type === 'soundPack') return (user.equippedSoundPack ?? 'classic') === item.id;
  return (user.equippedProfileFrame ?? 'none') === item.id;
}
