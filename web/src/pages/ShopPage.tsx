import { useEffect, useState } from 'react';
import { Check, Coins, Paintbrush, ShoppingCart, Sparkles, UserRound } from 'lucide-react';
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
    title: 'Profil Çerçeveleri',
    icon: UserRound,
    items: [
      { id: 'none', type: 'profileFrame', name: 'Çerçevesiz', price: 0, color: 'var(--sl-border)' },
      { id: 'gold', type: 'profileFrame', name: 'Altın Halka', price: 150, color: '#d9a748' },
      { id: 'emerald', type: 'profileFrame', name: 'Zümrüt Odak', price: 180, color: '#3a8264' },
      { id: 'ruby', type: 'profileFrame', name: 'Yakut Seri', price: 220, color: '#c0533f' },
      { id: 'cosmic', type: 'profileFrame', name: 'Kozmik Lounge', price: 320, color: '#8b7fd0' },
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
        description="Odaklandıkça kazandığın puanlarla sohbet rengi, isim ikonu ve profil çerçevesi al. Aldıkların telefonda da görünür."
        action={
          <div className="inline-flex items-center gap-3 rounded-xl border border-accent bg-lightAmber px-4 py-3 text-accentDark">
            <Coins className="h-5 w-5" />
            <span className="font-semibold">{user.coins ?? 0} Odak Puanı</span>
          </div>
        }
      />

      {message ? <Surface className={`mb-5 p-4 text-base font-semibold ${message.startsWith('Öğe') ? 'text-primary' : 'text-danger'}`}>{message}</Surface> : null}

      <div className="space-y-7">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-3 flex items-center gap-3">
              <IconTile icon={section.icon} tone="primary" />
              <h2 className="text-xl font-semibold text-textDark">{section.title}</h2>
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
                        <h3 className="truncate text-lg font-semibold text-textDark">{item.name}</h3>
                        <p className="mt-1 text-base text-textMuted">
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
                        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
                          owned || item.price === 0 ? 'border border-primary bg-surface text-primary' : 'bg-primary text-onPrimary hover:bg-secondary'
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
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 bg-surface" style={{ borderColor: item.color }}>
        <div className="h-7 w-7 rounded-full" style={{ backgroundColor: item.color, opacity: 0.25 }} />
      </div>
    );
  }
  return <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-softIndigo text-lg font-semibold text-primary">{item.text}</div>;
}
