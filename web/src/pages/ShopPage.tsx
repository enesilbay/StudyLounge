import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Check, Coins, Loader2, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import type { ShopItem, User } from '../lib/types';
import { Avatar, Notice } from '../components/ui';
import { AppPage, Card, CountUp, Rise, SegmentedTabs } from '../components/app/Kit';
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

  if (loading || !user) return <p className="py-16 text-center text-mb-body">Mağaza yükleniyor…</p>;
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
    <AppPage
      title="Mağaza"
      description="Odaklandıkça kazandığın puanlarla görünümünü değiştir. Aldıkların telefonda da görünür."
      actions={
        <p className="inline-flex items-center gap-2.5 rounded-[14px] border border-mb-line bg-mb-card px-4 py-2 shadow-mb-card">
          <m.span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-full bg-mb-tint text-mb-action"
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Coins className="h-4 w-4" />
          </m.span>
          <span className="font-mb-display text-2xl font-light tabular-nums text-mb-ink">
            <CountUp value={user.coins ?? 0} />
          </span>
          <span className="text-sm text-mb-body">Odak Puanı</span>
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <div className="max-w-xl">
            <SegmentedTabs
              panelId="shop-items"
              label="Ürün türü"
              value={category}
              onChange={(next) => {
                setCategory(next);
                setPreview(null);
              }}
              options={CATEGORIES.map(([key, label]) => ({ value: key, label }))}
            />
          </div>
          <p className="mt-3 text-sm text-mb-body">{CATEGORIES.find(([key]) => key === category)?.[2]}</p>

          {message ? (
            <div className="mt-4">
              <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>
            </div>
          ) : null}

          <div role="tabpanel" id="shop-items" aria-labelledby={`shop-items-tab-${category}`}>
          <ul key={category} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item, index) => {
              const owned = isOwned(user, item);
              const active = isActive(user, item);
              const affordable = owned || item.price <= (user.coins ?? 0);
              const key = `${item.type}:${item.id}`;
              const previewing = preview?.id === item.id && preview.type === item.type;
              return (
                <m.li
                  key={key}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    onMouseEnter={() => setPreview(item)}
                    onFocus={() => setPreview(item)}
                    className={`flex h-full flex-col items-center rounded-[18px] border bg-mb-card p-4 text-center shadow-mb-card transition-colors ${
                      active ? 'border-mb-action ring-1 ring-mb-action' : previewing ? 'border-mb-action/40' : 'border-mb-line/70'
                    }`}
                  >
                    <ItemSwatch item={item} user={user} />
                    <p className="mt-3 text-[15px] font-medium text-mb-ink">{item.name}</p>
                    <p className="text-[13px] text-mb-body">{active ? 'Kuşanıldı' : owned ? 'Sende var' : `${item.price} puan`}</p>
                    <div className="mt-3 w-full">
                      {active ? (
                        <p className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-mb-action">
                          <Check className="h-4 w-4" /> Kullanılıyor
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={!affordable || busyKey === key}
                          onClick={() => void act(item)}
                          className={`inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55 ${
                            owned || !affordable ? 'border border-mb-line bg-mb-card text-mb-ink hover:bg-mb-surface' : 'bg-mb-action text-mb-on-action shadow-mb-press hover:bg-mb-action-2'
                          }`}
                        >
                          {busyKey === key ? <Loader2 className="h-4 w-4 animate-spin" /> : !affordable ? <Lock className="h-4 w-4" /> : null}
                          {owned ? 'Kuşan' : affordable ? 'Satın al' : 'Puan yetmiyor'}
                        </button>
                      )}
                    </div>
                  </div>
                </m.li>
              );
            })}
          </ul>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-labelledby="preview-title">
          <Rise delay={0.15}>
            <Card className="p-5">
              <h2 id="preview-title" className="font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">Odada seni böyle görürler</h2>
              <p className="mt-1 text-sm text-mb-body">{preview ? `${preview.name} önizleniyor.` : 'Bir ürünün üstüne gel ya da seç.'}</p>

              <div className="mt-5 flex items-center gap-3">
                <m.span key={look.frame} initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 16 }}>
                  <Avatar name={user.fullName} image={user.avatarUrl} frame={look.frame} premium={user.isPremium} size="lg" />
                </m.span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium text-mb-ink">
                    {user.fullName}{' '}
                    <m.span key={look.icon} className="inline-block" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                      {look.icon}
                    </m.span>
                  </p>
                  <p className="text-[13px] text-mb-body">@{user.username}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2 rounded-[14px] bg-mb-surface p-3">
                <p className="max-w-[85%] rounded-[14px] rounded-bl-[4px] bg-mb-card px-3 py-2 text-[15px] text-mb-ink">Bu turda hangi üniteye bakıyorsun?</p>
                {/* Balon rengi kullanıcının satın aldığı renk; veri olduğu için satır içi verilir. */}
                <p className="ml-auto max-w-[85%] rounded-[14px] rounded-br-[4px] px-3 py-2 text-[15px] text-white transition-colors duration-500" style={{ backgroundColor: look.bubble }}>
                  Türev, 3. bölüm. Molada konuşuruz.
                </p>
              </div>
              <p className="mt-2 text-xs text-mb-body">Mesaj balonu rengi telefondaki oda sohbetinde görünür.</p>
            </Card>
          </Rise>
        </aside>
      </div>
    </AppPage>
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
        <span className="rounded-[12px] rounded-br-[4px] px-3 py-1.5 text-sm text-white" style={{ backgroundColor: item.color }}>
          Merhaba
        </span>
      </span>
    );
  }
  return (
    <span className="grid h-16 w-full place-items-center">
      <span className="text-sm font-medium text-mb-ink">
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
