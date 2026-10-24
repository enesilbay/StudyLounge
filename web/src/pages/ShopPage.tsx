import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Check, Coins, Flame, Image as ImageIcon, Lamp, Loader2, Lock, MessageCircle, RefreshCw, Snowflake, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import { COVER_STYLES, DEFAULT_BUBBLE_COLOR, FRAME_STYLES, LAMP_COLORS, coverStyle, lampColor, purchasedBubbleColor } from '../lib/cosmetics';
import type { ShopItem, ShopItemType, User } from '../lib/types';
import { Avatar, Notice } from '../components/ui';
import { AppPage, CountUp, Rise, outlineButton } from '../components/app/Kit';
import { useAuthStore } from '../store/authStore';

type Category = Extract<ShopItemType, 'profileFrame' | 'profileCover' | 'lampColor' | 'color' | 'streakFreeze'>;

/** Kategoriler: her birinin kendi pastel zemini var; mağaza renkli ama renkler token'lardan gelir. */
const CATEGORIES: { key: Category; label: string; hint: string; icon: LucideIcon; tile: string }[] = [
  { key: 'profileFrame', label: 'Çerçeve', hint: 'Avatarının etrafındaki halka; odada, sıralamada ve profilinde görünür.', icon: Sparkles, tile: 'bg-mb-tile-4' },
  { key: 'profileCover', label: 'Kapak', hint: 'Profilinin üst bandı; profiline bakan herkes görür.', icon: ImageIcon, tile: 'bg-mb-tile-2' },
  { key: 'lampColor', label: 'Lamba', hint: 'Odada odaklanınca kutunun etrafında yanan ışığın rengi.', icon: Lamp, tile: 'bg-mb-tile-5' },
  { key: 'color', label: 'Balon', hint: 'Oda sohbetindeki mesaj balonlarının rengi; odada ve sohbette görünür.', icon: MessageCircle, tile: 'bg-mb-tile-6' },
  { key: 'streakFreeze', label: 'Seri koruma', hint: 'Bir gün çalışamazsan serin bozulmaz.', icon: Snowflake, tile: 'bg-mb-tile-7' },
];

const MAX_FREEZES = 2;

/** Yalnızca görünümü tanımlı ürünler listelenir (isim ikonları ve ses paketleri web'de satılmaz). */
function isListed(item: ShopItem): boolean {
  switch (item.type) {
    case 'profileFrame':
      return item.id === 'none' || item.id in FRAME_STYLES;
    case 'profileCover':
      return item.id === 'none' || item.id in COVER_STYLES;
    case 'lampColor':
      return item.id in LAMP_COLORS;
    case 'color':
      return item.id.toUpperCase() === DEFAULT_BUBBLE_COLOR || purchasedBubbleColor(item.id) !== null;
    case 'streakFreeze':
      return true;
    default:
      return false;
  }
}

function displayName(item: ShopItem) {
  return item.type === 'color' && item.id.toUpperCase() === DEFAULT_BUBBLE_COLOR ? 'Varsayılan' : item.name;
}

/** Fiyata göre nadirlik etiketi; renkler kategori zeminleriyle aynı token ailesinden. */
function rarity(price: number) {
  if (price === 0) return { label: 'Ücretsiz', cls: 'bg-mb-card/80 text-mb-body' };
  if (price < 200) return { label: 'Sıradan', cls: 'bg-mb-tile-1 text-mb-ink' };
  if (price < 300) return { label: 'Nadir', cls: 'bg-mb-tile-2 text-mb-ink' };
  if (price < 400) return { label: 'Destansı', cls: 'bg-mb-tile-4 text-mb-ink' };
  return { label: 'Efsanevi', cls: 'bg-mb-tile-5 text-mb-ink' };
}

/** Odak Puanıyla görünüm satın alma. Sağdaki önizleme, seçili ürünle seni nasıl göreceklerini gösterir. */
export default function ShopPage() {
  const { user, setUser, refreshUser } = useAuthStore();
  const [category, setCategory] = useState<Category>('profileFrame');
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<ShopItem[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const [catalogAttempt, setCatalogAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    api
      .get<ShopItem[]>('/users/shop/catalog')
      .then((response) => alive && setCatalog(response.data.filter(isListed)))
      .catch(() => alive && setCatalogError(true));
    return () => {
      alive = false;
    };
  }, [catalogAttempt]);
  const retryCatalog = () => {
    setCatalogError(false);
    setCatalogAttempt((attempt) => attempt + 1);
  };

  const items = useMemo(() => (catalog ?? []).filter((item) => item.type === category), [catalog, category]);
  const current = CATEGORIES.find((entry) => entry.key === category)!;

  if (loading || !user) return <p className="py-16 text-center text-mb-body">Mağaza yükleniyor…</p>;
  const coins = user.coins ?? 0;

  const act = async (item: ShopItem) => {
    const owned = isOwned(user, item);
    if (!owned && item.price > coins) {
      setMessage({ tone: 'danger', text: `Bunun için ${item.price - coins} puan daha gerekiyor. Odaklandıkça puan kazanırsın.` });
      return;
    }
    const key = `${item.type}:${item.id}`;
    setBusyKey(key);
    setMessage(null);
    try {
      let next: User;
      if (owned) {
        next = unwrapUser<User>((await api.post('/users/equip', { itemType: item.type, itemId: item.id })).data);
        setMessage({ tone: 'success', text: `${displayName(item)} kuşanıldı.` });
      } else {
        next = unwrapUser<User>((await api.post('/users/buy', { itemType: item.type, itemId: item.id })).data);
        // Alınan ürün hemen kuşanılır; seri koruma kendiliğinden kullanılır.
        if (item.type !== 'streakFreeze') {
          next = unwrapUser<User>((await api.post('/users/equip', { itemType: item.type, itemId: item.id })).data);
        }
        setCelebrate(key);
        window.setTimeout(() => setCelebrate((value) => (value === key ? null : value)), 1100);
        setMessage({
          tone: 'success',
          text: item.type === 'streakFreeze' ? 'Seri koruma alındı. Bir günü kaçırırsan kendiliğinden kullanılır.' : `${displayName(item)} senin ve kuşanıldı.`,
        });
      }
      setUser(next);
    } catch (error) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error) });
    } finally {
      setBusyKey(null);
    }
  };

  // Önizleme: seçili/üstüne gelinen ürün, diğerleri kuşanılan haliyle.
  const look = {
    frame: preview?.type === 'profileFrame' ? preview.id : user.equippedProfileFrame ?? 'none',
    cover: preview?.type === 'profileCover' ? preview.id : user.equippedProfileCover ?? 'none',
    lamp: preview?.type === 'lampColor' ? preview.id : user.equippedLampColor ?? 'classic',
    bubble: preview?.type === 'color' ? preview.id : user.equippedBubbleColor ?? DEFAULT_BUBBLE_COLOR,
  };

  return (
    <AppPage
      title="Mağaza"
      description="Odaklandıkça kazandığın puanlarla tarzını yansıt. Aldıkların odada ve profilinde görünür."
      actions={
        <p className="inline-flex items-center gap-2.5 rounded-full bg-mb-tile-5 py-1.5 pl-1.5 pr-4 shadow-mb-card">
          <m.span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-full bg-mb-lamp text-mb-solid shadow-[0_0_18px_-4px_var(--color-mb-lamp)]"
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Coins className="h-4 w-4" />
          </m.span>
          <span className="font-mb-display text-2xl font-light tabular-nums text-mb-ink">
            <CountUp value={coins} />
          </span>
          <span className="text-sm text-mb-ink/75">Odak Puanı</span>
        </p>
      }
    >
      <CategoryTiles value={category} onChange={(next) => { setCategory(next); setPreview(null); }} />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-mb-body">
            <current.icon className="h-4 w-4 text-mb-ink" aria-hidden="true" />
            {current.hint}
          </p>

          {message ? (
            <div className="mt-4">
              <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>
            </div>
          ) : null}

          <div role="tabpanel" id="shop-items" aria-labelledby={`shop-tab-${category}`} className="mt-4">
            {catalogError ? (
              <div className="rounded-[20px] border border-mb-line/70 bg-mb-card p-8 text-center shadow-mb-card">
                <p className="text-[15px] text-mb-ink">Ürünler yüklenemedi.</p>
                <button type="button" onClick={retryCatalog} className={`${outlineButton} mt-4`}>
                  <RefreshCw className="h-4 w-4" /> Tekrar dene
                </button>
              </div>
            ) : !catalog ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Yükleniyor">
                {Array.from({ length: 6 }, (_, index) => (
                  <li key={index} className="h-60 animate-pulse rounded-[20px] bg-mb-surface" />
                ))}
              </ul>
            ) : category === 'streakFreeze' ? (
              items[0] ? <FreezeCard item={items[0]} user={user} busy={busyKey !== null} celebrating={celebrate !== null} onBuy={() => void act(items[0])} /> : null
            ) : (
              <ul key={category} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item, index) => {
                  const key = `${item.type}:${item.id}`;
                  return (
                    <ItemCard
                      key={key}
                      item={item}
                      user={user}
                      index={index}
                      tile={current.tile}
                      busy={busyKey === key}
                      disabled={busyKey !== null}
                      celebrating={celebrate === key}
                      previewing={preview?.type === item.type && preview.id === item.id}
                      onPreview={() => setPreview(item)}
                      onAct={() => void act(item)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-labelledby="preview-title">
          <Rise delay={0.15}>
            <PreviewCard user={user} look={look} previewName={preview ? displayName(preview) : null} />
          </Rise>
        </aside>
      </div>
    </AppPage>
  );
}

/* ───────────────────────── Kategori kutuları ───────────────────────── */

function CategoryTiles({ value, onChange }: { value: Category; onChange: (value: Category) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, position: number) => {
    const last = CATEGORIES.length - 1;
    const next = { ArrowRight: position === last ? 0 : position + 1, ArrowLeft: position === 0 ? last : position - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(CATEGORIES[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Ürün türü" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORIES.map((entry, position) => {
        const selected = entry.key === value;
        return (
          <button
            key={entry.key}
            ref={(node) => {
              refs.current[position] = node;
            }}
            id={`shop-tab-${entry.key}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="shop-items"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(entry.key)}
            onKeyDown={(event) => onKeyDown(event, position)}
            className={`group relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[16px] p-2.5 pr-4 text-left transition sm:shrink ${entry.tile} ${
              selected ? 'shadow-mb-raised ring-2 ring-mb-ink' : 'opacity-80 hover:-translate-y-0.5 hover:opacity-100'
            }`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] transition ${selected ? 'bg-mb-ink text-mb-bg' : 'bg-mb-card/80 text-mb-ink group-hover:scale-110'}`}>
              <entry.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 text-sm font-medium leading-tight text-mb-ink">{entry.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Ürün kartı ───────────────────────── */

function ItemCard({
  item,
  user,
  index,
  tile,
  busy,
  disabled,
  celebrating,
  previewing,
  onPreview,
  onAct,
}: {
  item: ShopItem;
  user: User;
  index: number;
  tile: string;
  busy: boolean;
  disabled: boolean;
  celebrating: boolean;
  previewing: boolean;
  onPreview: () => void;
  onAct: () => void;
}) {
  const owned = isOwned(user, item);
  const active = isActive(user, item);
  const affordable = owned || item.price <= (user.coins ?? 0);
  const tag = rarity(item.price);

  return (
    <m.li
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      className={`relative flex flex-col overflow-hidden rounded-[20px] border bg-mb-card shadow-mb-card transition-colors ${
        active ? 'border-mb-action ring-2 ring-mb-action' : previewing ? 'border-mb-ink/30' : 'border-mb-line/70'
      }`}
    >
      <div className={`relative grid h-36 place-items-center overflow-hidden ${item.type === 'profileCover' ? '' : tile}`}>
        <StageGlow item={item} />
        <ItemStage item={item} user={user} />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tag.cls}`}>{tag.label}</span>
        {active ? (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-mb-action text-mb-on-action shadow-mb-card" aria-hidden="true">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <Burst show={celebrating} />
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[15px] font-medium leading-snug text-mb-ink">{displayName(item)}</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-mb-body">
          {active ? (
            'Kullanılıyor'
          ) : owned ? (
            'Sende var'
          ) : (
            <>
              <Coins className="h-3.5 w-3.5 text-mb-ink" aria-hidden="true" />
              <span className="font-medium tabular-nums text-mb-ink">{item.price}</span> puan
            </>
          )}
        </p>
        <div className="mt-3">
          {active ? (
            <p className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-mb-action-ink">
              <Check className="h-4 w-4" /> Kuşanıldı
            </p>
          ) : (
            <button
              type="button"
              disabled={!affordable || disabled}
              onClick={onAct}
              aria-label={`${displayName(item)}: ${owned ? 'kuşan' : affordable ? `${item.price} puana satın al` : 'puan yetmiyor'}`}
              className={`inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55 ${
                owned || !affordable ? 'border border-mb-line bg-mb-card text-mb-ink hover:bg-mb-surface' : 'bg-mb-action text-mb-on-action shadow-mb-press hover:bg-mb-action-2'
              }`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : !affordable ? <Lock className="h-4 w-4" /> : null}
              {owned ? 'Kuşan' : affordable ? 'Satın al' : 'Puan yetmiyor'}
            </button>
          )}
        </div>
      </div>
    </m.li>
  );
}

/** Kartın üst bölümünde ürünün kendisi: çerçeveli avatar, kapak, yanan lamba ya da mesaj balonu. */
function ItemStage({ item, user }: { item: ShopItem; user: User }) {
  if (item.type === 'profileFrame') {
    return (
      <span className="relative transition-transform duration-300 [li:hover_&]:scale-110 [&>div]:!h-24 [&>div]:!w-24">
        <Avatar name={user.fullName} image={user.avatarUrl} frame={item.id} size="xl" />
      </span>
    );
  }
  if (item.type === 'profileCover') {
    const background = coverStyle(item.id);
    return (
      <span className={`absolute inset-0 flex items-end gap-2 p-3 ${background ? '' : 'bg-mb-solid'}`} style={background ? { background } : undefined}>
        <Avatar name={user.fullName} image={user.avatarUrl} frame={user.equippedProfileFrame} size="xs" />
        <span className="mb-1 h-2 w-16 rounded-full bg-white/70" aria-hidden="true" />
      </span>
    );
  }
  if (item.type === 'lampColor') {
    return <LampTile lamp={item.id} name={user.fullName} image={user.avatarUrl} />;
  }
  const bubble = purchasedBubbleColor(item.id);
  return (
    <span
      className={`rounded-[14px] rounded-br-[4px] px-3.5 py-2 text-sm font-medium shadow-mb-card transition-transform duration-300 [li:hover_&]:-rotate-3 [li:hover_&]:scale-110 ${bubble ? 'text-white' : 'bg-mb-action text-mb-on-action'}`}
      style={bubble ? { backgroundColor: bubble } : undefined}
    >
      Merhaba!
    </span>
  );
}

/** Ürünün kendi renginde yumuşak ışık hâlesi; her kart kendi rengiyle ayrışır. */
function StageGlow({ item }: { item: ShopItem }) {
  const background =
    item.type === 'profileFrame'
      ? FRAME_STYLES[item.id]?.ring
      : item.type === 'lampColor'
        ? lampColor(item.id)
        : item.type === 'color'
          ? purchasedBubbleColor(item.id) ?? 'var(--color-mb-action)'
          : undefined;
  if (!background) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute h-28 w-28 rounded-full opacity-55 blur-2xl transition-opacity duration-300 [li:hover_&]:opacity-90"
      style={{ background }}
    />
  );
}

/** Odadaki kişi kutusunun küçük hali; lamba ışığı yavaşça nefes alır. */
function LampTile({ lamp, name, image, label = false }: { lamp: string; name: string; image?: string | null; label?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <m.span
      className="relative grid aspect-[4/3] w-28 place-items-center rounded-[14px] bg-mb-card ring-2 ring-[var(--tile-lamp)]"
      style={{ '--tile-lamp': lampColor(lamp) } as CSSProperties}
      animate={reduce ? undefined : { boxShadow: ['0 0 18px -6px var(--tile-lamp)', '0 0 34px -4px var(--tile-lamp)', '0 0 18px -6px var(--tile-lamp)'] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Avatar name={name} image={image} size="sm" />
      {label ? (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-[6px] bg-mb-card/90 px-1.5 text-[10px] font-medium text-mb-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--tile-lamp)]" aria-hidden="true" /> Odakta
        </span>
      ) : null}
    </m.span>
  );
}

/** Satın alınca karttan saçılan renkli parçacıklar (hareket azaltılmışsa gösterilmez). */
function Burst({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  const colors = ['bg-mb-lamp', 'bg-mb-tile-4', 'bg-mb-tile-6', 'bg-mb-action', 'bg-mb-tile-2', 'bg-mb-tile-5'];
  return (
    <AnimatePresence>
      {show && !reduce ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          {Array.from({ length: 14 }, (_, index) => {
            const angle = (index / 14) * Math.PI * 2;
            return (
              <m.span
                key={index}
                className={`absolute h-2.5 w-2.5 rounded-full ${colors[index % colors.length]}`}
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                animate={{ x: Math.cos(angle) * 70, y: Math.sin(angle) * 55, scale: 1, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
        </span>
      ) : null}
    </AnimatePresence>
  );
}

/* ───────────────────────── Seri koruma ───────────────────────── */

function FreezeCard({ item, user, busy, celebrating, onBuy }: { item: ShopItem; user: User; busy: boolean; celebrating: boolean; onBuy: () => void }) {
  const held = user.streakFreezes ?? 0;
  const full = held >= MAX_FREEZES;
  const affordable = item.price <= (user.coins ?? 0);

  return (
    <Rise>
      <article className="relative overflow-hidden rounded-[24px] bg-mb-tile-7 p-6 shadow-mb-card md:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-[28px] bg-mb-card/80 shadow-mb-card">
            <m.span animate={{ rotate: [0, 12, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
              <Snowflake className="h-14 w-14 text-mb-info" aria-hidden="true" />
            </m.span>
            <Burst show={celebrating} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-mb-display text-2xl font-light tracking-[-0.03em] text-mb-ink">{item.name}</h2>
            <p className="mt-1 max-w-lg text-[15px] text-mb-ink/80">
              Bir günü kaçırırsan ertesi gün çalıştığında serin bozulmaz; koruma kendiliğinden harcanır. Kaçırdığın her gün için bir koruma gerekir.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <p className="flex items-center gap-1.5" aria-label={`Elinde ${held} / ${MAX_FREEZES} koruma`}>
                {Array.from({ length: MAX_FREEZES }, (_, index) => (
                  <span
                    key={index}
                    className={`grid h-9 w-9 place-items-center rounded-full ${index < held ? 'bg-mb-info text-white shadow-mb-card' : 'border-2 border-dashed border-mb-ink/25 text-mb-ink/30'}`}
                  >
                    <Snowflake className="h-4 w-4" aria-hidden="true" />
                  </span>
                ))}
                <span className="ml-1 text-sm font-medium text-mb-ink">{held} / {MAX_FREEZES}</span>
              </p>
              <p className="inline-flex items-center gap-1.5 text-sm text-mb-ink/80">
                <Flame className="h-4 w-4" aria-hidden="true" /> Şu anki serin: <span className="font-medium text-mb-ink">{user.currentStreak ?? 0} gün</span>
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBuy}
                disabled={busy || full || !affordable}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-mb-action px-5 text-[15px] font-medium text-mb-on-action shadow-mb-press transition hover:bg-mb-action-2 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : full || !affordable ? <Lock className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                {full ? 'Elin dolu' : affordable ? `${item.price} puana al` : 'Puan yetmiyor'}
              </button>
              <p className="text-xs text-mb-ink/70">En fazla {MAX_FREEZES} koruma tutabilirsin.</p>
            </div>
          </div>
        </div>
      </article>
    </Rise>
  );
}

/* ───────────────────────── Önizleme ───────────────────────── */

function PreviewCard({
  user,
  look,
  previewName,
}: {
  user: User;
  look: { frame: string; cover: string; lamp: string; bubble: string };
  previewName: string | null;
}) {
  const background = coverStyle(look.cover);
  const bubble = purchasedBubbleColor(look.bubble);

  return (
    <div className="overflow-hidden rounded-[20px] border border-mb-line/70 bg-mb-card shadow-mb-card">
      <div className="relative h-28 bg-mb-solid transition-[background] duration-500" style={background ? { background } : undefined}>
        <p className="absolute right-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {previewName ? `${previewName} önizleniyor` : 'Önizleme'}
        </p>
      </div>
      <div className="-mt-10 px-5">
        <m.span key={look.frame} className="inline-block" initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 16 }}>
          <Avatar name={user.fullName} image={user.avatarUrl} frame={look.frame} premium={user.isPremium} size="xl" />
        </m.span>
        <h2 id="preview-title" className="mt-2 truncate font-mb-display text-xl font-medium tracking-[-0.02em] text-mb-ink">
          {user.fullName}
        </h2>
        <p className="text-[13px] text-mb-body">@{user.username} · seni böyle görürler</p>
      </div>

      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-t border-mb-line/70 bg-mb-surface px-5 py-4">
        <LampTile lamp={look.lamp} name={user.fullName} image={user.avatarUrl} label />
        <div className="space-y-2">
          <p className="max-w-full rounded-[14px] rounded-bl-[4px] bg-mb-card px-3 py-1.5 text-sm text-mb-ink">Hangi ünitedesin?</p>
          <p
            className={`ml-auto w-fit max-w-full rounded-[14px] rounded-br-[4px] px-3 py-1.5 text-sm transition-colors duration-500 ${bubble ? 'text-white' : 'bg-mb-action text-mb-on-action'}`}
            style={bubble ? { backgroundColor: bubble } : undefined}
          >
            Türev, 3. bölüm.
          </p>
        </div>
      </div>
    </div>
  );
}

function isOwned(user: User, item: ShopItem) {
  if (item.price === 0) return true;
  switch (item.type) {
    case 'color':
      return user.ownedColors?.includes(item.id) ?? false;
    case 'profileCover':
      return (user.ownedProfileCovers ?? ['none']).includes(item.id);
    case 'lampColor':
      return (user.ownedLampColors ?? ['classic']).includes(item.id);
    case 'streakFreeze':
      return false;
    default:
      return (user.ownedProfileFrames ?? ['none']).includes(item.id);
  }
}

function isActive(user: User, item: ShopItem) {
  switch (item.type) {
    case 'color':
      return (user.equippedBubbleColor ?? DEFAULT_BUBBLE_COLOR).toUpperCase() === item.id.toUpperCase();
    case 'profileCover':
      return (user.equippedProfileCover ?? 'none') === item.id;
    case 'lampColor':
      return (user.equippedLampColor ?? 'classic') === item.id;
    case 'streakFreeze':
      return false;
    default:
      return (user.equippedProfileFrame ?? 'none') === item.id;
  }
}
