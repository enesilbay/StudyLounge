import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, LockKeyhole, Sparkles, Trophy, UsersRound, EyeOff, Smartphone, ShieldCheck, HeartHandshake } from 'lucide-react';
import { BrandLockup, IconTile, Pill, Surface } from '../components/ui';
import logo from '../assets/images/logo.png';
import { motion } from 'framer-motion';

const features = [
  { icon: EyeOff, title: 'Kamerasız Sosyallik', text: 'Kamera veya mikrofon açmak yok. Sadece masada olduğunu belirten küçük bir durum göstergesiyle arkadaşlarına varlığını hissettir.', tone: 'primary' as const },
  { icon: Smartphone, title: 'Akıllı Algılama', text: 'Telefonunu masaya bıraktığın an sensörler çalışmaya başlar ve odak modun otomatik olarak aktifleşir.', tone: 'success' as const },
  { icon: HeartHandshake, title: 'Akademik Dayanışma', text: 'Ayrı evlerde, ayrı odalarda olsanız da aynı sanal lobide çalışmanın getirdiği motivasyonla yalnızlığı yenin.', tone: 'info' as const },
  { icon: Trophy, title: 'Oyunlaştırma & Analiz', text: 'Çalışma sürelerinle puan kazan, marketten özel renkler al ve liderlik tablosunda arkadaşlarınla yarış.', tone: 'accent' as const },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-textDark selection:bg-primary/20">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <BrandLockup />
          <button onClick={() => navigate('/auth')} className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-primary px-6 text-base font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-secondary hover:shadow-lg">
            Giriş Yap
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-20 text-center lg:px-8 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <Pill tone="accent">
              <Sparkles className="h-3.5 w-3.5" />
              Geleceğin Odak Platformu
            </Pill>
            
            <h1 className="mt-8 max-w-5xl text-5xl font-black leading-tight text-textDark md:text-7xl">
              Ayrı Masalarda, <br/>
              <span className="text-primary">Aynı Lobide.</span>
            </h1>
            
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-textMuted md:text-xl">
              Ders çalışırken yaşadığın yalnızlık ve odaklanma sorununu bitiriyoruz. Telefonu masaya bırak, sanal odandaki arkadaşlarınla birlikte motive ol ve kamera stresi olmadan başar.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button onClick={() => navigate('/auth')} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-black text-white shadow-[0_10px_30px_rgba(26,35,126,0.3)] transition hover:-translate-y-0.5 hover:bg-secondary">
                Hemen Ücretsiz Başla
                <ArrowRight className="h-5 w-5" />
              </button>
              <button onClick={() => navigate('/app/lobbies')} className="inline-flex min-h-14 items-center justify-center rounded-xl border border-border bg-white/50 backdrop-blur-sm px-8 text-base font-black text-textDark transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                Odaları İncele
              </button>
            </div>
          </motion.div>
        </section>

        {/* VISUAL / MOCKUP SECTION */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-softIndigo via-white to-lightAmber opacity-50 blur-lg" />
            <Surface className="relative overflow-hidden p-2 sm:p-4 shadow-2xl rounded-[2rem]">
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                {/* Simulated UI Header */}
                <div className="border-b border-border bg-gray-50/50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="StudyLounge" className="h-10 w-10 object-contain drop-shadow-sm" />
                    <div>
                      <h3 className="font-black text-textDark">Tıp Fakültesi Final Odası</h3>
                      <p className="text-xs font-bold text-success flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success animate-pulse" /> 18 Kişi Odakta</p>
                    </div>
                  </div>
                </div>
                {/* Simulated UI Body */}
                <div className="p-8 bg-gradient-to-br from-softIndigo/30 to-background grid gap-8 md:grid-cols-2 items-center">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-black text-xl">A</div>
                      <div>
                        <p className="font-bold text-textDark">Ahmet Y.</p>
                        <p className="text-xs text-textMuted flex items-center gap-1"><LockKeyhole className="w-3 h-3"/> Odak modunda (35 dk)</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex items-center gap-4 ml-6 opacity-90">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white font-black text-xl">Z</div>
                      <div>
                        <p className="font-bold text-textDark">Zeynep K.</p>
                        <p className="text-xs text-textMuted flex items-center gap-1"><LockKeyhole className="w-3 h-3"/> Odak modunda (12 dk)</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex items-center gap-4 opacity-70">
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-black text-xl">M</div>
                      <div>
                        <p className="font-bold text-textDark">Mehmet T.</p>
                        <p className="text-xs text-textMuted">Ara verdi</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-64 h-64 rounded-full border-8 border-softIndigo flex items-center justify-center bg-white shadow-inner relative">
                      <div className="text-center">
                        <Clock3 className="w-10 h-10 text-primary mx-auto mb-2 opacity-50" />
                        <span className="text-5xl font-black text-primary font-mono tracking-tighter">45:00</span>
                        <p className="text-sm font-bold text-textMuted mt-1 uppercase tracking-widest">Odak Süresi</p>
                      </div>
                      {/* Decorative progress ring */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-primary" strokeDasharray="289" strokeDashoffset="60" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>
        </section>

        {/* FEATURES GRID */}
        <section className="bg-white py-24 border-y border-border">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-black text-textDark md:text-5xl">Çalışma alışkanlığını değiştiren özellikler</h2>
              <p className="mt-4 text-lg text-textMuted font-medium">Mahremiyetini korurken sosyal motivasyondan faydalanmanı sağlayan altyapı.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, idx) => (
                <motion.div 
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <Surface className="h-full p-8 transition-all hover:-translate-y-2 hover:shadow-xl">
                    <IconTile icon={feature.icon} tone={feature.tone} />
                    <h3 className="mt-6 text-xl font-black text-textDark">{feature.title}</h3>
                    <p className="mt-3 text-base font-medium leading-relaxed text-textMuted">{feature.text}</p>
                  </Surface>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TARGET AUDIENCE & CTA */}
        <section className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
          <div className="rounded-[2.5rem] bg-primary px-6 py-16 text-center shadow-2xl sm:px-16 lg:py-20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            <h2 className="relative z-10 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
              Sen de odaklanma sorunu mu yaşıyorsun?
            </h2>
            <p className="relative z-10 mx-auto mt-6 max-w-2xl text-lg font-medium text-white/80">
              Üniversite sınavına hazırlananlar, evde yalnız çalışanlar ve motivasyona ihtiyaç duyan herkes için tasarlandı. StudyLounge topluluğuna katıl, başarıyı şansa bırakma.
            </p>
            <div className="relative z-10 mt-10 flex justify-center gap-4">
              <button onClick={() => navigate('/auth')} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-white px-8 text-lg font-black text-primary transition hover:bg-gray-50 hover:scale-105 active:scale-95 shadow-lg">
                Hesap Oluştur <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row lg:px-8">
          <BrandLockup compact />
          <p className="text-sm font-semibold text-textMuted">
            &copy; {new Date().getFullYear()} StudyLounge. Tüm hakları saklıdır. Mezuniyet Projesi.
          </p>
          <div className="flex gap-4">
            <ShieldCheck className="w-5 h-5 text-textMuted hover:text-primary transition-colors cursor-pointer" />
            <UsersRound className="w-5 h-5 text-textMuted hover:text-primary transition-colors cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
