/** Oda kategorileri (oda kurma, filtre ve oda ayarları). */
export const ROOM_FILTER_CATEGORIES = [
  'Tümü',
  'Bilgisayar Bilimi',
  'Tıp & Sağlık',
  'Hukuk',
  'Sınav Hazırlık',
  'Yabancı Dil',
  'Tasarım & Sanat',
  'Mühendislik',
  'İşletme & Ekonomi',
  'Fen Bilimleri',
  'Genel',
];

export const ROOM_CATEGORIES = ROOM_FILTER_CATEGORIES.filter((category) => category !== 'Tümü');
