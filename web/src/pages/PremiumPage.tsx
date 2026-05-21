import { BarChart3, CheckCircle2, Crown, FileUp, LockKeyhole, Sparkles, UsersRound, Zap } from 'lucide-react';
import { IconTile, PageHeader, Pill, Surface } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import logo from '../assets/images/logo.png';

const features = [
  { icon: Crown, title: 'Elite odalar', text: 'Premium odalarda gelişmiş çalışma alanlarına eriş.' },
  { icon: BarChart3, title: 'Detaylı analitik', text: 'Haftalık grafikler ve verimli saatlerini gör.' },
  { icon: UsersRound, title: 'Daha iyi grup yönetimi', text: 'Gizli odalarda daha fazla kişiyle çalış.' },
  { icon: FileUp, title: 'Paylaşım araçları', text: 'PDF ve görselleri çalışma odalarında düzenli paylaş.' },
];

export default function PremiumPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <PageHeader
        eyebrow="Premium"
        title="StudyLounge Premium"
        description="PRO deneyimi web üzerinde avantaj kartları ve hesap durumuna göre gösterilir."
        action={<Pill tone={user?.isPremium ? 'success' : 'accent'}>{user?.isPremium ? 'Premium aktif' : 'Yükseltilebilir'}</Pill>}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Surface className="overflow-hidden">
            <div className="grid grid-cols-1 gap-6 p-7 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
              <div className="grid h-36 w-36 place-items-center rounded-3xl bg-lightAmber">
                <img src={logo} alt="StudyLounge Premium" className="h-24 w-24 object-contain" />
              </div>
              <div>
                <Pill tone="accent">Elite çalışma paketi</Pill>
                <h2 className="mt-4 text-4xl font-black text-textDark">Odak oturumlarını daha güçlü yönet.</h2>
                <p className="mt-3 text-base font-semibold leading-6 text-textMuted">
                  Elite odalar, analitik, ses paketleri, profil çerçeveleri ve özel oda yönetimi tek pakette.
                </p>
              </div>
            </div>
          </Surface>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <Surface key={feature.title} className="p-5">
                <IconTile icon={feature.icon} tone="accent" />
                <h3 className="mt-4 text-lg font-black text-textDark">{feature.title}</h3>
                <p className="mt-2 text-base font-semibold leading-6 text-textMuted">{feature.text}</p>
              </Surface>
            ))}
          </div>
        </div>

        <Surface className="p-6">
          <div className="flex items-center justify-between">
            <IconTile icon={Sparkles} tone="accent" />
            <Pill tone={user?.isPremium ? 'success' : 'accent'}>{user?.isPremium ? 'Hesabında aktif' : 'Hazır'}</Pill>
          </div>
          <div className="mt-6">
            <p className="text-base font-black uppercase text-textMuted">Premium plan</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-black text-textDark">₺49</span>
              <span className="pb-2 text-base font-bold text-textMuted">/ay</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {['Elite oda erişimi', 'Premium profil çerçeveleri', 'Ses mikseri presetleri', 'Detaylı haftalık analiz'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-base font-bold text-textDark">{item}</p>
              </div>
            ))}
          </div>

          <button disabled className="mt-7 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-black text-white opacity-70">
            <Zap className="h-4 w-4" />
            Ödeme entegrasyonu bekleniyor
          </button>
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-background p-4">
            <LockKeyhole className="mt-0.5 h-4 w-4 text-textMuted" />
            <p className="text-base font-semibold leading-5 text-textMuted">
              Bu ekran gerçek hesap durumunu okur; ödeme sağlayıcısı bağlandığında yükseltme akışı buradan tamamlanacak.
            </p>
          </div>
        </Surface>
      </div>
    </div>
  );
}
