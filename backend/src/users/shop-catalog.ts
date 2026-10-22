export type ShopItemType =
  | 'color'
  | 'icon'
  | 'soundPack'
  | 'profileFrame'
  | 'profileCover'
  | 'lampColor'
  | 'streakFreeze';

export const SHOP_ITEM_TYPES: ShopItemType[] = [
  'color',
  'icon',
  'soundPack',
  'profileFrame',
  'profileCover',
  'lampColor',
  'streakFreeze',
];

export interface ShopCatalogItem {
  type: ShopItemType;
  id: string;
  name: string;
  price: number;
}

/** Ayni anda elde tutulabilecek en fazla seri koruma sayisi. */
export const MAX_STREAK_FREEZES = 2;

/**
 * Mağazadaki ürünlerin tek doğru kaynağı. Fiyat her zaman buradan okunur;
 * istemcinin gönderdiği fiyat dikkate alınmaz. Mobil ve web aynı id'leri kullanır.
 * İsim ikonları (icon) web'den kaldırıldı; eski mobil istemci satın alabilsin diye katalogda duruyor.
 */
export const SHOP_CATALOG: ShopCatalogItem[] = [
  { type: 'color', id: '#4F46E5', name: 'StudyLounge Mavisi', price: 0 },
  { type: 'color', id: '#059669', name: 'Zümrüt Yeşili', price: 100 },
  { type: 'color', id: '#E11D48', name: 'Yakut Kırmızısı', price: 150 },
  { type: 'color', id: '#D97706', name: 'Kehribar Sarısı', price: 150 },
  { type: 'color', id: '#7C3AED', name: 'Ametist Moru', price: 200 },
  { type: 'color', id: '#0284C7', name: 'Okyanus Mavisi', price: 150 },
  { type: 'color', id: '#DB2777', name: 'Fuşya', price: 180 },
  { type: 'color', id: '#0F766E', name: 'Deniz Mavisi', price: 120 },

  { type: 'icon', id: '', name: 'Yok', price: 0 },
  { type: 'icon', id: '🔥', name: 'Ateş', price: 50 },
  { type: 'icon', id: '⚡', name: 'Yıldırım', price: 80 },
  { type: 'icon', id: '💎', name: 'Elmas', price: 250 },
  { type: 'icon', id: '🎓', name: 'Mezuniyet', price: 300 },
  { type: 'icon', id: '🚀', name: 'Roket', price: 400 },

  { type: 'soundPack', id: 'classic', name: 'Klasik Lounge', price: 0 },

  { type: 'profileFrame', id: 'none', name: 'Çerçevesiz', price: 0 },
  { type: 'profileFrame', id: 'gold', name: 'Altın Halka', price: 150 },
  { type: 'profileFrame', id: 'emerald', name: 'Zümrüt Odak', price: 180 },
  { type: 'profileFrame', id: 'ruby', name: 'Yakut Seri', price: 220 },
  { type: 'profileFrame', id: 'ocean', name: 'Okyanus', price: 240 },
  { type: 'profileFrame', id: 'sunset', name: 'Gün Batımı', price: 260 },
  { type: 'profileFrame', id: 'sakura', name: 'Sakura', price: 280 },
  { type: 'profileFrame', id: 'cosmic', name: 'Kozmik Lounge', price: 320 },
  { type: 'profileFrame', id: 'aurora', name: 'Aurora', price: 380 },
  { type: 'profileFrame', id: 'prism', name: 'Gökkuşağı', price: 450 },

  { type: 'profileCover', id: 'none', name: 'Sade', price: 0 },
  { type: 'profileCover', id: 'library', name: 'Kütüphane Gecesi', price: 200 },
  { type: 'profileCover', id: 'forest', name: 'Orman', price: 220 },
  { type: 'profileCover', id: 'sunrise', name: 'Gün Doğumu', price: 240 },
  { type: 'profileCover', id: 'ocean', name: 'Derin Mavi', price: 260 },
  { type: 'profileCover', id: 'galaxy', name: 'Galaksi', price: 400 },

  { type: 'lampColor', id: 'classic', name: 'Klasik Sarı', price: 0 },
  { type: 'lampColor', id: 'mint', name: 'Nane', price: 120 },
  { type: 'lampColor', id: 'sky', name: 'Gökyüzü', price: 150 },
  { type: 'lampColor', id: 'rose', name: 'Gül', price: 150 },
  { type: 'lampColor', id: 'violet', name: 'Lavanta', price: 200 },
  { type: 'lampColor', id: 'flame', name: 'Alev', price: 250 },

  { type: 'streakFreeze', id: 'freeze', name: 'Seri Koruma', price: 200 },
];

export function findShopItem(
  type: ShopItemType,
  id: string,
): ShopCatalogItem | undefined {
  return SHOP_CATALOG.find((item) => item.type === type && item.id === id);
}
