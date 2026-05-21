import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Clock3, Headphones, LockKeyhole, MessageCircle, Sparkles, Trophy, UsersRound } from 'lucide-react';
import { BrandLockup, IconTile, Pill, Surface } from '../components/ui';
import logo from '../assets/images/logo.png';

const features = [
  { icon: UsersRound, title: 'Çalışma odaları', text: 'Ortak lobiler, özel odalar ve Elite alanlar aynı akışta yönetilir.', tone: 'primary' as const },
  { icon: Clock3, title: 'Pomodoro', text: 'Başlat, durdur ve masada olma durumu gerçek zamanlı senkronize olur.', tone: 'success' as const },
  { icon: MessageCircle, title: 'Sohbet', text: 'Oda sohbeti, direkt mesaj ve görsel paylaşımı webde de desteklenir.', tone: 'info' as const },
  { icon: Trophy, title: 'Oyunlaştırma', text: 'Puan, rozet, çerçeve ve market deneyimi mobile ile tutarlı çalışır.', tone: 'accent' as const },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden bg-background text-textDark">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-2 lg:px-12">
          <BrandLockup large logoOnly />
          <button onClick={() => navigate('/auth')} className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-primary px-6 text-base font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-secondary hover:shadow-lg">
            Giriş Yap
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1.08fr)_600px] lg:px-12 xl:gap-16">
          <div>
            <Pill tone="accent">
              <Sparkles className="h-3.5 w-3.5" />
              Mezuniyet projesi • StudyLounge
            </Pill>
            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[1.04] text-textDark md:text-6xl xl:text-7xl">
              Beraber çalışmak için daha sakin, daha akıllı bir odak alanı.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-textMuted">
              StudyLounge web; mobildeki lobi, pomodoro, sohbet, profil, mağaza ve analitik akışlarını aynı API mantığıyla tek ekranda buluşturur.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('/auth')} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-secondary hover:shadow-md">
                Hemen Başla
                <ArrowRight className="h-5 w-5" />
              </button>
              <button onClick={() => navigate('/app/lobbies')} className="inline-flex min-h-14 items-center justify-center rounded-xl border border-border bg-white px-8 text-base font-black text-textDark transition hover:-translate-y-0.5 hover:bg-softIndigo">
                Lobileri Keşfet
              </button>
            </div>

            <div className="mt-10 grid w-full grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ['Canlı', 'Odak odası'],
                ['Anlık', 'Pomodoro'],
                ['API', 'Veri akışı'],
                ['JWT', 'Güvenli giriş'],
              ].map(([value, label]) => (
                <Surface key={label} className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-2xl font-black text-primary">{value}</p>
                  <p className="mt-1 text-sm font-bold text-textMuted">{label}</p>
                </Surface>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-softIndigo via-white to-accent/10" />
            <Surface className="relative overflow-hidden p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <div className="flex items-center gap-4">
                  <img src={logo} alt="StudyLounge" className="h-20 w-20 object-contain" />
                  <div>
                    <p className="text-xl font-black text-primary">Canlı çalışma paneli</p>
                    <p className="text-base font-bold text-textMuted">Mobile uyumlu web akışı</p>
                  </div>
                </div>
                <Pill tone="success">Aktif</Pill>
              </div>

              <div className="mt-6 rounded-xl bg-gradient-to-br from-primary to-electric p-6 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black uppercase text-white/75">Pomodoro</p>
                  <Clock3 className="h-6 w-6 text-accent" />
                </div>
                <p className="mt-5 font-mono text-6xl font-black">25:00</p>
                <div className="mt-5 h-2.5 rounded-full bg-white/20">
                  <div className="h-full w-2/3 rounded-full bg-accent" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { icon: UsersRound, label: 'Odada', value: '18' },
                  { icon: Headphones, label: 'Ses', value: 'Rain' },
                  { icon: BarChart3, label: 'Hafta', value: '320 dk' },
                  { icon: Trophy, label: 'Rozet', value: '3' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-background p-4">
                    <item.icon className="h-5 w-5 text-primary" />
                    <p className="mt-4 text-xl font-black text-textDark">{item.value}</p>
                    <p className="text-base font-bold text-textMuted">{item.label}</p>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1600px] px-6 pb-10 lg:px-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <Surface key={feature.title} className="p-5 transition hover:-translate-y-1 hover:shadow-lg">
                <IconTile icon={feature.icon} tone={feature.tone} />
                <h2 className="mt-4 text-lg font-black text-textDark">{feature.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-textMuted">{feature.text}</p>
              </Surface>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1600px] px-6 pb-12 lg:px-12">
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-primary">Hazır çalışma alanı</p>
              <h2 className="mt-2 text-2xl font-black text-textDark">Web ve mobile aynı akıştan devam et.</h2>
            </div>
            <button onClick={() => navigate('/auth')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-black text-white transition hover:bg-secondary">
              Giriş ekranına git
              <LockKeyhole className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
