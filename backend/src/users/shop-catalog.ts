export type ShopItemType = 'color' | 'icon' | 'soundPack' | 'profileFrame';

export const SHOP_ITEM_TYPES: ShopItemType[] = ['color', 'icon', 'soundPack', 'profileFrame'];

export interface ShopCatalogItem {
  type: ShopItemType;
  id: string;
  name: string;
  price: number;
}

/**
 * Mağazadaki ürünlerin tek doğru kaynağı. Fiyat her zaman buradan okunur;
 * istemcinin gönderdiği fiyat dikkate alınmaz. Mobil ve web aynı id'leri kullanır.
 */
export const SHOP_CATALOG: ShopCatalogItem[] = [
  { type: 'color', id: '#4F46E5', name: 'StudyLounge Mavisi', price: 0 },
  { type: 'color', id: '#059669', name: 'Zümrüt Yeşili', price: 100 },
  { type: 'color', id: '#E11D48', name: 'Yakut Kırmızısı', price: 150 },
  { type: 'color', id: '#D97706', name: 'Kehribar Sarısı', price: 150 },
  { type: 'color', id: '#7C3AED', name: 'Ametist Moru', price: 200 },

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
  { type: 'profileFrame', id: 'cosmic', name: 'Kozmik Lounge', price: 320 },
];

export function findShopItem(type: ShopItemType, id: string): ShopCatalogItem | undefined {
  return SHOP_CATALOG.find((item) => item.type === type && item.id === id);
}
