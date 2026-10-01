import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { Camera, MonitorUp, Smartphone } from 'lucide-react';
import { BrandLockup, LampMark, ThemeToggle } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const desks = [
  { name: 'Zeynep', subject: 'Biyokimya', lit: true },
  { name: 'Mert', subject: 'Diferansiyel denklemler', lit: true },
  { name: 'Elif', subject: 'Ceza hukuku', lit: false },
  { name: 'Can', subject: 'YDS kelime', lit: true },
  { name: 'Deniz', subject: 'Algoritma analizi', lit: true },
  { name: 'Selin', subject: 'Anatomi', lit: false },
];

const ways = [
  {
    icon: Smartphone,
    title: 'Telefonu masaya koy',
    text: 'Mobil uygulama ivmeölçerle telefonun masada durduğunu anlar ve sayacı kendisi başlatır. Telefonu eline aldığında mola verilir. Kamera yok, mikrofon yok.',
  },
  {
    icon: Camera,
    title: 'İstersen kamerayı aç',
    text: 'Web’deki kameralı odalarda arkadaşlarınla yüz yüze çalışabilirsin. Kamera ve mikrofon sen açana kadar kapalı kalır, görüntü sunucuya uğramadan doğrudan karşı tarafa gider.',
  },
  {
    icon: MonitorUp,
    title: 'Ekranını paylaş',
    text: 'Aynı soruya takıldınız mı? Ekranını odaya paylaş, notunu ya da çözümü birlikte incele, sonra herkes kendi masasına dönsün.',
  },
];

export default function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const reduceMotion = useReducedMotion();
  // Sayfa açılışında lambalar sırayla yanar (tek koreografili an).
  const [litUpTo, setLitUpTo] = useState(0);
  const primaryHref = isAuthenticated ? '/app/lobbies' : '/auth';

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setLitUpTo((current) => {
        if (current >= desks.length) window.clearInterval(timer);
        return current + 1;
      });
    }, 380);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const visibleStep = reduceMotion ? desks.length : litUpTo;

  return (
    <div className="min-h-screen bg-background text-textDark">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <BrandLockup />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to={primaryHref} className="inline-flex min-h-10 items-center rounded-lg px-4 text-[15px] font-semibold text-textDark hover:bg-sunken">
            {isAuthenticated ? 'Odalara git' : 'Giriş yap'}
          </Link>
        </div>
      </header>

      <main>
        {/* Hero: okuma salonu */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
          <div>
            <h1 className="text-5xl leading-[1.05] md:text-6xl xl:text-[4.75rem]">
              Ayrı masalarda,
              <br />
              aynı lobide.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-textMuted">
              StudyLounge, evde ya da kütüphanede tek başına çalışan öğrencileri aynı sanal okuma salonunda buluşturur.
              Kim odaklanıyorsa onun lambası yanar. Kendi lambanı yakmak için masana otur.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={primaryHref} className="inline-flex min-h-13 items-center gap-2.5 rounded-lg bg-accent px-6 text-base font-semibold text-background transition hover:brightness-110">
                <LampMark className="h-5 w-5" />
                {isAuthenticated ? 'Bir odaya otur' : 'Ücretsiz hesap aç'}
              </Link>
              {!isAuthenticated ? (
                <Link to="/auth" className="inline-flex min-h-13 items-center rounded-lg border border-border px-6 text-base font-semibold text-textDark transition hover:bg-sunken">
                  Hesabım var
                </Link>
              ) : null}
            </div>
          </div>

          <div className="sl-panel relative overflow-hidden p-5 md:p-7" aria-label="Örnek bir çalışma odası">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <p className="font-display text-xl">Final haftası, sessiz oda</p>
              <p className="text-sm text-textMuted">4 lamba yanıyor</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {desks.map((desk, index) => {
                const lit = desk.lit && index < visibleStep;
                return (
                  <div key={desk.name} className="relative overflow-hidden rounded-xl border border-border bg-background px-3 pb-3 pt-4">
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${lit ? 'opacity-100' : 'opacity-0'}`}
                      style={{ backgroundImage: 'radial-gradient(110% 70% at 50% -5%, var(--sl-lamp), transparent 70%)' }}
                    />
                    <div className="relative flex flex-col items-center text-center">
                      <LampMark lit={lit} className="h-10 w-10" />
                      <p className="mt-2 text-[15px] font-semibold">{desk.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-textMuted">{desk.lit ? desk.subject : 'Molada'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Üç çalışma biçimi */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
            <h2 className="max-w-2xl text-3xl md:text-4xl">Nasıl çalışacağına sen karar ver</h2>
            <p className="mt-3 max-w-2xl text-lg text-textMuted">
              Aynı hesap hem telefonda hem tarayıcıda çalışır. Odak süren, serin ve puanın ikisinde de aynıdır.
            </p>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {ways.map((way) => (
                <div key={way.title}>
                  <way.icon className="h-6 w-6 text-accent" />
                  <h3 className="mt-4 text-2xl">{way.title}</h3>
                  <p className="mt-2 text-base leading-7 text-textMuted">{way.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gizlilik */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <blockquote className="font-display text-3xl leading-snug md:text-4xl">
              “Kamera hiçbir odada zorunlu değil. Sadece masada olduğunu bilmeleri yeter.”
            </blockquote>
            <ul className="space-y-4 text-base leading-7 text-textMuted">
              <li>Kameralı odalar ayrıca işaretlenir; normal odalarda görüntü özelliği hiç açılmaz.</li>
              <li>Görüntü ve ses tarayıcılar arasında doğrudan akar, kaydedilmez.</li>
              <li>Ekran paylaşımını tarayıcının kendi düğmesiyle istediğin an durdurabilirsin.</li>
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
          <div className="sl-panel sl-lamp-on flex flex-col items-start gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-12">
            <div>
              <h2 className="text-3xl md:text-4xl">Bu akşam bir masa boş.</h2>
              <p className="mt-2 text-lg text-textMuted">Hesap açmak bir dakika sürer, ücretsizdir.</p>
            </div>
            <Link to={primaryHref} className="inline-flex min-h-13 shrink-0 items-center gap-2.5 rounded-lg bg-accent px-6 text-base font-semibold text-background transition hover:brightness-110">
              <LampMark className="h-5 w-5" />
              {isAuthenticated ? 'Odalara git' : 'Masanı ayır'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-textMuted sm:flex-row sm:items-center sm:justify-between md:px-8">
          <BrandLockup compact />
          <p>Enes İlbay tarafından mezuniyet projesi olarak geliştirildi, {new Date().getFullYear()}.</p>
        </div>
      </footer>
    </div>
  );
}
