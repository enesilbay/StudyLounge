import React from 'react';
import { ShoppingBag, Star } from 'lucide-react';

export default function ShopPage() {
  const items = [
    { name: 'Elite Çerçeve', price: 500, type: 'frame' },
    { name: 'Alev İkonu', price: 300, type: 'icon' },
    { name: 'Yağmur Sesi Paketi', price: 1000, type: 'sound' },
    { name: 'Orman Sesi Paketi', price: 1000, type: 'sound' },
  ];

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-textDark mb-2">Market</h1>
          <p className="text-textMuted font-medium">Odak puanlarınla yeni özellikler aç.</p>
        </div>
        <div className="bg-lightAmber text-accent font-black px-4 py-2 rounded-xl flex items-center gap-2">
          <Star className="w-5 h-5" /> 1,450
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[24px] border border-border flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-softIndigo rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-textDark mb-4">{item.name}</h3>
            <button className="w-full bg-softSuccess text-success font-bold py-2 rounded-xl hover:bg-success hover:text-white transition-colors flex items-center justify-center gap-2">
              <Star className="w-4 h-4" /> {item.price}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
