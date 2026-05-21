import { useState } from 'react';
import { ShoppingBag, Star, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

const PROFILE_FRAMES = [
  { id: 'none', name: 'Çerçevesiz', desc: 'Sade profil görünümü.', price: 0, color: '#E2E8F0' },
  { id: 'gold', name: 'Altın Halka', desc: 'Parlak başarı çerçevesi.', price: 150, color: '#FFC107' },
  { id: 'emerald', name: 'Zümrüt Odak', desc: 'Yeşil odak çerçevesi.', price: 180, color: '#10B981' },
  { id: 'ruby', name: 'Yakut Seri', desc: 'Kırmızı seri çerçevesi.', price: 220, color: '#EF4444' },
  { id: 'cosmic', name: 'Kozmik Lounge', desc: 'Mor premium çerçeve hissi.', price: 320, color: '#7C3AED' },
];

const COLORS = [
  { id: '#4F46E5', name: 'StudyLounge Mavisi', price: 0 },
  { id: '#059669', name: 'Zümrüt Yeşili', price: 100 },
  { id: '#E11D48', name: 'Yakut Kırmızısı', price: 150 },
  { id: '#D97706', name: 'Kehribar Sarısı', price: 150 },
  { id: '#7C3AED', name: 'Ametist Moru', price: 200 },
];

const ICONS = [
  { id: '', name: 'Yok', price: 0 },
  { id: '🔥', name: 'Ateş', price: 50 },
  { id: '⚡', name: 'Yıldırım', price: 80 },
  { id: '💎', name: 'Elmas', price: 250 },
  { id: '🎓', name: 'Mezuniyet', price: 300 },
  { id: '🚀', name: 'Roket', price: 400 },
];

const SOUND_PACKS = [
  { id: 'classic', name: 'Klasik Lounge', desc: 'Kütüphane, yağmur, doğa.', price: 0 },
  { id: 'rainy', name: 'Yağmur Modu', desc: 'Yağmur ağırlıklı.', price: 120 },
  { id: 'forest', name: 'Orman Odası', desc: 'Doğa ve hafif yağmur.', price: 180 },
  { id: 'fireplace', name: 'Şömine Köşesi', desc: 'Şömine ve sıcak kütüphane.', price: 220 },
  { id: 'deep', name: 'Derin Odak', desc: 'Daha sakin presetler.', price: 300 },
];

export default function ShopPage() {
  const { user, initAuth } = useAuthStore();
  const [processing, setProcessing] = useState(false);

  const handleBuy = async (itemType: string, itemId: string, price: number) => {
    if (!user) return;
    if (user.coins! < price) {
      alert('Yetersiz puan!');
      return;
    }
    
    try {
      setProcessing(true);
      await api.post('/users/buy', { itemType, itemId, price });
      await initAuth();
      alert('Satın alma başarılı!');
    } catch (err) {
      console.error(err);
      alert('Satın alma işlemi başarısız.');
    } finally {
      setProcessing(false);
    }
  };

  const handleEquip = async (itemType: string, itemId: string) => {
    try {
      setProcessing(true);
      await api.post('/users/equip', { itemType, itemId });
      await initAuth();
    } catch (err) {
      console.error(err);
      alert('Kullanma işlemi başarısız.');
    } finally {
      setProcessing(false);
    }
  };

  if (!user) return <div>Yükleniyor...</div>;

  const renderShopItem = (item: any, type: string, isOwned: boolean, isEquipped: boolean, renderIcon: () => React.ReactNode) => {
    return (
      <div key={item.id} className="bg-white p-6 rounded-[24px] border border-border flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
        {renderIcon()}
        <h3 className="font-bold text-textDark mb-1">{item.name}</h3>
        <p className="text-xs text-textMuted mb-4 h-8">{item.desc || ''}</p>
        
        {isEquipped ? (
          <button disabled className="w-full bg-softSuccess text-success font-bold py-2 rounded-xl flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Kullanılıyor
          </button>
        ) : isOwned ? (
          <button 
            disabled={processing} 
            onClick={() => handleEquip(type, item.id)}
            className="w-full bg-white border-2 border-primary text-primary font-bold py-1.5 rounded-xl hover:bg-softIndigo transition-colors flex items-center justify-center gap-2"
          >
            Kullan
          </button>
        ) : (
          <button 
            disabled={processing}
            onClick={() => handleBuy(type, item.id, item.price)}
            className="w-full bg-softSuccess text-success font-bold py-2 rounded-xl hover:bg-success hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" /> {item.price}
          </button>
        )}
      </div>
    );
  };

  const renderProfileFrameItem = (item: typeof PROFILE_FRAMES[0]) => {
    const ownedProfileFrames = user.ownedProfileFrames || ['none'];
    const isOwned = item.price === 0 || ownedProfileFrames.includes(item.id);
    const isEquipped = (user.equippedProfileFrame || 'none') === item.id;

    return (
      <div key={item.id} className="bg-white p-6 rounded-[24px] border border-border flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
        <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center mb-4" style={{ borderColor: item.color, backgroundColor: `${item.color}20` }}>
          <ShoppingBag className="w-8 h-8" style={{ color: item.color !== '#E2E8F0' ? item.color : '#94a3b8' }} />
        </div>
        <h3 className="font-bold text-textDark mb-1">{item.name}</h3>
        <p className="text-xs text-textMuted mb-4 h-8">{item.desc}</p>
        
        {isEquipped ? (
          <button disabled className="w-full bg-softSuccess text-success font-bold py-2 rounded-xl flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Kullanılıyor
          </button>
        ) : isOwned ? (
          <button 
            disabled={processing} 
            onClick={() => handleEquip('profileFrame', item.id)}
            className="w-full bg-white border-2 border-primary text-primary font-bold py-1.5 rounded-xl hover:bg-softIndigo transition-colors flex items-center justify-center gap-2"
          >
            Kullan
          </button>
        ) : (
          <button 
            disabled={processing}
            onClick={() => handleBuy('profileFrame', item.id, item.price)}
            className="w-full bg-softSuccess text-success font-bold py-2 rounded-xl hover:bg-success hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Star className="w-4 h-4" /> {item.price}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-textDark mb-2">Market</h1>
          <p className="text-textMuted font-medium">Odak puanlarınla yeni özellikler aç.</p>
        </div>
        <div className="bg-lightAmber text-accent font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-accent/20">
          <Star className="w-5 h-5" /> {user.coins || 0}
        </div>
      </header>

      <h2 className="text-xl font-bold text-textDark mb-4 mt-8">Profil Çerçeveleri</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {PROFILE_FRAMES.map(renderProfileFrameItem)}
      </div>

      <h2 className="text-xl font-bold text-textDark mb-4 mt-8">Sohbet Balonu Renkleri</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {COLORS.map(item => {
          const ownedColors = (user as any).ownedColors || ['#4F46E5'];
          const isOwned = item.price === 0 || ownedColors.includes(item.id);
          const isEquipped = (user.equippedBubbleColor || '#4F46E5') === item.id;
          return renderShopItem(item, 'color', isOwned, isEquipped, () => (
            <div className="w-16 h-16 rounded-full mb-4 border-2 border-border shadow-sm" style={{ backgroundColor: item.id }} />
          ));
        })}
      </div>

      <h2 className="text-xl font-bold text-textDark mb-4 mt-8">İsim Yanı İkonları</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ICONS.map(item => {
          const ownedIcons = (user as any).ownedIcons || [''];
          const isOwned = item.price === 0 || ownedIcons.includes(item.id);
          const isEquipped = (user.equippedIcon || '') === item.id;
          return renderShopItem(item, 'icon', isOwned, isEquipped, () => (
            <div className="w-16 h-16 rounded-full mb-4 border border-border shadow-sm bg-gray-50 flex items-center justify-center text-3xl">
              {item.id || '-'}
            </div>
          ));
        })}
      </div>

      <h2 className="text-xl font-bold text-textDark mb-4 mt-8">Ses Paketleri</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {SOUND_PACKS.map(item => {
          const ownedSoundPacks = (user as any).ownedSoundPacks || ['classic'];
          const isOwned = item.price === 0 || ownedSoundPacks.includes(item.id);
          const isEquipped = ((user as any).equippedSoundPack || 'classic') === item.id;
          return renderShopItem(item, 'soundPack', isOwned, isEquipped, () => (
            <div className="w-16 h-16 rounded-2xl mb-4 border border-border shadow-sm bg-softIndigo flex items-center justify-center text-primary">
              <ShoppingBag className="w-8 h-8" />
            </div>
          ));
        })}
      </div>
    </div>
  );
}
