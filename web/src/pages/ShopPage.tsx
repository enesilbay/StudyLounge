import { useEffect, useState } from 'react';
import { Check, Coins, Headphones, Paintbrush, ShoppingCart, Sparkles, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import type { ShopItem, ShopSection, User } from '../lib/types';
import { IconTile, PageHeader, Pill, StateBlock, Surface } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const sections: ShopSection[] = [
  {
    title: 'Sohbet Balonu Renkleri',
    icon: Paintbrush,
    items: [
      { id: '#4F46E5', type: 'color', name: 'StudyLounge Mavisi', price: 0, color: '#4F46E5' },
      { id: '#059669', type: 'color', name: 'Zümrüt Yeşili', price: 100, color: '#059669' },
      { id: '#E11D48', type: 'color', name: 'Yakut Kırmızısı', price: 150, color: '#E11D48' },
      { id: '#D97706', type: 'color', name: 'Kehribar Sarısı', price: 150, color: '#D97706' },
      { id: '#7C3AED', type: 'color', name: 'Ametist Moru', price: 200, color: '#7C3AED' },
    ],
  },
  {
    title: 'İsim Yanı İkonları',
    icon: Sparkles,
    items: [
      { id: '', type: 'icon', name: 'Yok', price: 0, text: '🚫' },
      { id: '🔥', type: 'icon', name: 'Ateş', price: 50, text: '🔥' },
      { id: '⚡', type: 'icon', name: 'Yıldırım', price: 80, text: '⚡' },
      { id: '💎', type: 'icon', name: 'Elmas', price: 250, text: '💎' },
      { id: '🎓', type: 'icon', name: 'Mezuniyet', price: 300, text: '🎓' },
      { id: '🚀', type: 'icon', name: 'Roket', price: 400, text: '🚀' },
    ],
  },
  {
    title: 'Ses Paketi Skinleri',
    icon: Headphones,
    items: [
      { id: 'classic', type: 'soundPack', name: 'Klasik Lounge', price: 0, text: 'CL' },
      { id: 'rainy', type: 'soundPack', name: 'Yağmur Modu', price: 120, text: 'RM' },
      { id: 'forest', type: 'soundPack', name: 'Orman Odası', price: 180, text: 'FO' },
      { id: 'fireplace', type: 'soundPack', name: 'Şömine Köşesi', price: 220, text: 'FK' },
      { id: 'deep', type: 'soundPack', name: 'Derin Odak', price: 300, text: 'DO' },
    ],
  },
  {
    title: 'Profil Çerçeveleri',
    icon: UserRound,
    items: [
      { id: 'none', type: 'profileFrame', name: 'Çerçevesiz', price: 0, color: '#E5E7EB' },
      { id: 'gold', type: 'profileFrame', name: 'Altın Halka', price: 150, color: '#FFC107' },
      { id: 'emerald', type: 'profileFrame', name: 'Zümrüt Odak', price: 180, color: '#2E7D32' },
      { id: 'ruby', type: 'profileFrame', name: 'Yakut Seri', price: 220, color: '#D32F2F' },
      { id: 'cosmic', type: 'profileFrame', name: 'Kozmik Lounge', price: 320, color: '#7C3AED' },
    ],
  },
];

export default function ShopPage() {
  const { user, setUser, refreshUser } = useAuthStore();
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const handleItemAction = async (item: ShopItem) => {
    if (!user) return;
    const owned = isOwned(user, item);
    const active = isActive(user, item);
    if (active) return;

    if (!owned && item.price > (user.coins ?? 0)) {
      setMessage('Yetersiz Bakiye. Bu öğeyi almak için yeterli Odak Puanın yok.');
      return;
    }

    setBusyItem(`${item.type}:${item.id}`);
    setMessage(null);
    try {
      if (owned || item.price === 0) {
        const response = await api.post('/users/equip', { itemType: item.type, itemId: item.id });
        setUser(unwrapUser<User>(response.data));
      } else {
        const buyResponse = await api.post('/users/buy', { itemType: item.type, itemId: item.id, price: item.price });
        const boughtUser = unwrapUser<User>(buyResponse.data);
        setUser(boughtUser);
        setMessage('Öğe başarıyla satın alındı.');
      }
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusyItem(null);
    }
  };

  if (loading || !user) {
    return <StateBlock loading title="Odak Mağazası yükleniyor" />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Puanlarını harca"
        title="Odak Mağazası"
        description="Mobile mağazadaki renk, ikon, ses paketi ve profil çerçevesi contractlarıyla aynı itemType ve itemId değerleri kullanılır."
        action={
          <div className="inline-flex items-center gap-3 rounded-xl border border-accent bg-lightAmber px-4 py-3 text-accent">
            <Coins className="h-5 w-5" />
            <span className="font-black">{user.coins ?? 0} Odak Puanı</span>
          </div>
        }
      />

      {message ? <Surface className={`mb-5 p-4 text-base font-bold ${message.startsWith('Öğe') ? 'text-primary' : 'text-danger'}`}>{message}</Surface> : null}

      <div className="space-y-7">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-3 flex items-center gap-3">
              <IconTile icon={section.icon} tone="primary" />
              <h2 className="text-xl font-black text-textDark">{section.title}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {section.items.map((item) => {
                const owned = isOwned(user, item);
                const active = isActive(user, item);
                const busy = busyItem === `${item.type}:${item.id}`;
                return (
                  <Surface key={`${item.type}:${item.id}`} className="flex items-center justify-between gap-4 p-5">
                    <div className="flex min-w-0 items-center gap-4">
                      <Preview item={item} />
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-textDark">{item.name}</h3>
                        <p className="mt-1 text-base font-semibold text-textMuted">
                          {owned ? 'Sahipsin' : `${item.price} Puan`}
                        </p>
                      </div>
                    </div>
                    {active ? (
                      <Pill tone="success">
                        <Check className="h-4 w-4" />
                        Kuşanıldı
                      </Pill>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => void handleItemAction(item)}
                        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-base font-black disabled:cursor-not-allowed disabled:opacity-70 ${
                          owned || item.price === 0 ? 'border border-primary bg-white text-primary' : 'bg-primary text-white hover:bg-secondary'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {busy ? 'İşleniyor' : owned || item.price === 0 ? 'Kuşan' : 'Al'}
                      </button>
                    )}
                  </Surface>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
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
  if (item.type === 'color') return user.equippedBubbleColor === item.id;
  if (item.type === 'icon') return (user.equippedIcon ?? '') === item.id;
  if (item.type === 'soundPack') return (user.equippedSoundPack ?? 'classic') === item.id;
  return (user.equippedProfileFrame ?? 'none') === item.id;
}

function Preview({ item }: { item: { color?: string; text?: string } }) {
  if (item.color) {
    return (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 bg-white" style={{ borderColor: item.color }}>
        <div className="h-7 w-7 rounded-full" style={{ backgroundColor: item.color, opacity: 0.25 }} />
      </div>
    );
  }
  return <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-softIndigo text-lg font-black text-primary">{item.text}</div>;
}
