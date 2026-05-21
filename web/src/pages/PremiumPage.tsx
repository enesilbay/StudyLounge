import { useState } from 'react';
import { Crown, CheckCircle2, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function PremiumPage() {
  const { user, initAuth } = useAuthStore();
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    try {
      setProcessing(true);
      await api.post('/users/demo/upgrade');
      await initAuth();
      alert('Tebrikler! Artık Premium kullanıcısınız.');
      navigate('/app/profile');
    } catch (err) {
      console.error(err);
      alert('Premium işleminde hata oluştu.');
    } finally {
      setProcessing(false);
    }
  };

  const features = [
    'Tüm ses mikseri dosyalarına (Atmosfer) erişim',
    'Atmosferini odadaki diğer kullanıcılarla paylaşma',
    'Premium profil çerçeveleri ve rozetler',
    'Sınırsız düello daveti gönderme',
    'Özel Lobi kurabilme yetkisi',
  ];

  if (user?.isPremium) {
    return (
      <div className="pb-20 md:pb-0 max-w-3xl mx-auto flex flex-col items-center justify-center text-center py-20">
        <Crown className="w-24 h-24 text-accent mb-6" />
        <h1 className="text-4xl font-black text-textDark mb-4">Sen Zaten <span className="text-accent">Premium'sun!</span></h1>
        <p className="text-lg text-textMuted font-medium max-w-lg mx-auto">
          StudyLounge'un tüm özelliklerine sınırsız erişimin var. Odaklanmanın tadını çıkar!
        </p>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0 max-w-3xl mx-auto">
      <header className="mb-12 text-center">
        <div className="inline-flex w-20 h-20 bg-lightAmber rounded-full items-center justify-center mb-6 shadow-sm">
          <Crown className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-4xl font-black text-textDark mb-4">StudyLounge <span className="text-accent">Premium</span></h1>
        <p className="text-lg text-textMuted font-medium max-w-lg mx-auto">
          Odaklanma deneyimini en üst seviyeye taşı. Sadece sana özel sesler, rozetler ve ayrıcalıklar.
        </p>
      </header>

      <div className="bg-white rounded-[32px] border-2 border-accent shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 bg-accent text-white font-bold px-6 py-2 rounded-bl-2xl">
          EN İYİ FİYAT
        </div>
        <div className="p-8 md:p-12 border-b border-border bg-gradient-to-b from-lightAmber/30 to-white">
          <div className="flex items-end gap-2 mb-2">
            <h2 className="text-5xl font-black text-textDark">₺49</h2>
            <span className="text-textMuted font-bold mb-1">/aylık</span>
          </div>
          <p className="text-textMuted font-medium">İstediğin zaman iptal edebilirsin.</p>
        </div>
        
        <div className="p-8 md:p-12">
          <ul className="space-y-4 mb-8">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-4">
                <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
                <span className="text-textDark font-bold">{feature}</span>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={handleUpgrade}
            disabled={processing}
            className="w-full bg-accent text-white py-5 rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(255,193,7,0.4)] hover:bg-yellow-500 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {processing ? 'İşleniyor...' : <><Zap className="w-6 h-6" /> Premium'a Geç (Demo)</>}
          </button>
        </div>
      </div>
    </div>
  );
}
