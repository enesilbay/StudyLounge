import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Asterisk, BatteryLow, ChevronRight, Menu, Smartphone, UserX, X, type LucideIcon } from 'lucide-react';
import { RoomPlan } from '../components/landing/RoomPlan';
import { BoardFigure, BreakFigure, CameraFigure, PhoneOnDesk, RoomListFigure, TimerRhythm } from '../components/landing/Figures';
import { Container, HandArrow, LandingLockup, SectionHeading, Tag } from '../components/landing/Brutal';
import { lpBox, lpButton, lpButtonSm, lpFocus, lpH1, lpH3, lpH4, lpHeading, lpPaper, lpTextLink } from '../components/landing/styles';
import { useAuthStore } from '../store/authStore';

const navLinks = [
  { href: '#oda', label: 'Odada neler var' },
  { href: '#nasil', label: 'Nasıl çalışır' },
  { href: '#fiyat', label: 'Fiyat' },
  { href: '#sss', label: 'Sorular' },
];

const problems: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Smartphone,
    title: 'Dikkat dağılıyor',
    text: 'Telefon elinin altında, bir sekme daha açık. Kimse görmeyince "beş dakika ara" bir saate uzuyor.',
  },
  {
    icon: BatteryLow,
    title: 'Motivasyon eriyor',
    text: 'Aylara yayılan bir hazırlıkta her gün aynı saatte masaya oturmak, tek başına giderek zorlaşıyor.',
  },
  {
    icon: UserX,
    title: 'Yanında kimse yok',
    text: 'Kütüphanede yer yok, arkadaşların başka şehirde. Takıldığın soruyu soracak kimse yok.',
  },
];

type Benefit = { title: string; text: string; detail?: string; figure?: ReactNode; surface?: string };

/** Bento ızgara: her satırda bir geniş (renkli, çizimli) ve bir dar (beyaz, yalnızca metin) kart; sıra satır satır değişir. */
const benefitRows: Array<[Benefit, Benefit]> = [
  [
    {
      title: 'Ortak sayaç',
      text: 'Odak ve mola sırayla gelir; katılan herkesin sayacı aynıdır. Duraklatan ya da bitiren kim olursa olsun odadaki herkes görür.',
      detail: 'Kendi sayacınla da çalışabilirsin; ortak sayaca katılmak isteğe bağlı.',
      figure: <TimerRhythm />,
      surface: 'bg-lp-lemon',
    },
    {
      title: 'Kamera zorunlu değil',
      text: 'Normal odalarda kamera hiç açılmaz. Odak, telefonun masada durmasıyla ya da tarayıcı sekmesinin açık kalmasıyla ölçülür.',
    },
  ],
  [
    {
      title: 'Dersler ve hedefler',
      text: 'Her oturum hangi derse ait olduğuyla kaydedilir. Günlük ve haftalık hedef koyarsın, üst üste çalıştığın günler serini büyütür.',
    },
    {
      title: 'Ortak tahta',
      text: 'Ders notunu PDF olarak yükle, odadaki herkes aynı sayfayı görsün. Kalemle çiz, fosforlu kalemle işaretle, lazerle bir yeri göster.',
      detail: 'Tablet kalemiyle bastırdıkça çizgi kalınlaşır; avuç içi dokunuşu çizim yapmaz.',
      figure: <BoardFigure />,
      surface: 'bg-lp-mint',
    },
  ],
  [
    {
      title: 'İstersen kamera',
      text: 'Kameralı odalarda en fazla altı kişi görüntülü çalışır, takıldığı soruyu ekranını paylaşarak gösterir. Kamera ve mikrofon sen açana kadar kapalı kalır.',
      detail: 'Görüntü ve ses kaydedilmez.',
      figure: <CameraFigure />,
      surface: 'bg-lp-peach',
    },
    {
      title: 'Haftalık lig',
      text: 'Sıralama her pazartesi sıfırlanır. Arkadaşlarınla ya da herkesle yarışırsın; ilk üçe giren puan ödülü alır.',
    },
  ],
];

const steps: Array<{ title: string; text: string; figure: ReactNode; surface: string }> = [
  {
    title: 'Bir odaya gir',
    text: 'Konusuna göre açılmış odalardan birine katıl ya da arkadaşının kurduğu şifreli odaya gir. Kimin çalıştığını, kimin molada olduğunu hemen görürsün.',
    figure: <RoomListFigure />,
    surface: 'bg-lp-lemon',
  },
  {
    title: 'Lambanı yak',
    text: 'Telefon uygulamasını açıp telefonu masaya bırakman yeterli; telefon masada durdukça süren işler. Bilgisayarda "Odaklan"a basarsın, sekmeden uzun süre ayrılırsan odak durur.',
    figure: <PhoneOnDesk />,
    surface: 'bg-lp-mint',
  },
  {
    title: 'Birlikte mola ver',
    text: 'Biri ortak sayacı başlatınca katılan herkes aynı anda odaklanır, aynı anda mola verir. Sohbet molaya kalır; zil çalınca herkes masasına döner.',
    figure: <BreakFigure />,
    surface: 'bg-lp-card',
  },
];

const freeFeatures = ['Odalara ve şifreli odalara katılma', 'Ortak sayaç ve ortak PDF tahtası', 'Oda sohbeti, özel mesaj ve arkadaşlar', 'Dersler, hedefler ve istatistikler', 'Seri, rozetler ve haftalık lig'];

const premiumFeatures = ['Ücretsiz plandaki her şey', 'Kendi odanı kurma, istersen şifreli', 'Kameralı oda açma (en fazla 6 kişi)', 'Elite odalar: odak süren iki kat sayılır', 'Ortam seslerini odadakilerle eşleme'];

const faqs = [
  {
    q: 'Ücretsiz mi?',
    a: 'Evet. Hesap açmak, odalara katılmak, ortak sayaç, ortak tahta, sohbet, istatistikler, hedefler ve haftalık lig ücretsizdir.',
  },
  {
    q: 'Premium neler ekliyor?',
    a: 'Kendi odanı kurabilir, kameralı oda açabilir ve yalnızca Premium üyelerin girdiği, odak süresinin iki kat sayıldığı Elite odalara girebilirsin. Ortam seslerini de odadakilerle eşleyebilirsin.',
  },
  {
    q: 'Kamera açmam gerekiyor mu?',
    a: 'Hayır. Kamera yalnızca kameralı odalarda ve sen açarsan çalışır. Normal odalarda odak, telefonun masada durmasıyla ya da tarayıcı sekmesinin açık kalmasıyla ölçülür.',
  },
  {
    q: 'Telefonum yanımda değilse?',
    a: 'Bilgisayardan da çalışabilirsin. Odağı "Odaklan" düğmesi başlatır; sekmeden bir dakikadan uzun ayrılırsan odak duraklatılır. Aynı hesap telefonda ve bilgisayarda çalışır.',
  },
  {
    q: 'Verilerime ne oluyor?',
    a: 'Kameralı odalarda görüntü ve ses kaydedilmez. Hesabını Ayarlar\'dan istediğin an silebilirsin; oturum geçmişin, derslerin, görevlerin ve özel mesajların da silinir.',
  },
  {
    q: 'Arkadaşlarımla nasıl aynı odaya girerim?',
    a: 'Arkadaşını kullanıcı adıyla ekle, sonra aynı odaya katılın. Yalnızca sizin olacak bir oda istiyorsanız şifreli oda kurulabilir.',
  },
];

export default function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const primary = isAuthenticated ? { to: '/app/lobbies', label: 'Odalara git' } : { to: '/auth?mod=kayit', label: 'Ücretsiz hesap aç' };
  const premiumTo = isAuthenticated ? '/app/premium' : '/auth?mod=kayit';

  return (
    <div className={`min-h-screen overflow-x-clip font-lp-sans tracking-lp text-lp-ink ${lpPaper}`}>
      <a
        href="#icerik"
        className={`${lpBox} ${lpFocus} sr-only bg-lp-mustard px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50`}
      >
        İçeriğe geç
      </a>

      <SiteHeader isAuthenticated={isAuthenticated} primary={primary} />

      <main id="icerik">
        {/* ── Giriş ── */}
        <section aria-labelledby="giris-baslik" className="pb-16 pt-12 md:pb-lp-section md:pt-20">
          <Container className="text-center">
            <Tag>Birlikte çalışma odası</Tag>
            <h1 id="giris-baslik" className={`${lpH1} mx-auto mt-7 max-w-[56rem] text-balance`}>
              Ayrı masalarda, aynı lobide.
            </h1>
            <p className="mx-auto mt-5 max-w-[37rem] text-lp-lg font-medium text-lp-muted">
              StudyLounge, tek başına çalışan öğrencileri aynı sanal çalışma odasında buluşturur. Odaklanan herkesin lambası yanar; ortak sayaçla mola da birlikte gelir.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-8">
              <Link to={primary.to} className={lpButton}>
                {primary.label}
              </Link>
              <a href="#nasil" className={`${lpTextLink} justify-center`}>
                Nasıl çalıştığını gör <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-5 text-lp-sm font-medium text-lp-muted">Kamera açman gerekmez. Telefonda ve bilgisayarda aynı hesapla çalışır.</p>

            <div className="mx-auto mt-12 max-w-[62.5rem] text-left md:mt-[60px]">
              <RoomPlan />
            </div>
          </Container>
        </section>

        {/* ── Sorun ── */}
        <section aria-labelledby="sorun-baslik" className="py-16 md:py-lp-section">
          <Container>
            <SectionHeading id="sorun-baslik" title="Evde tek başına çalışmak zor" intro="Vize haftası da olsa, aylardır süren bir sınav hazırlığı da olsa sorun aynı: masada yalnızsın." />
            <ul className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3">
              {problems.map((problem) => (
                <li key={problem.title} className={`${lpBox} bg-lp-card px-6 py-8 text-center shadow-lp-md md:px-7`}>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-lp-ink bg-lp-peach">
                    <problem.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className={`${lpH3} mt-5`}>{problem.title}</h3>
                  <p className="mt-3 text-lp-base font-medium text-lp-muted">{problem.text}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ── Odada neler var (bento) ── */}
        <section id="oda" aria-labelledby="oda-baslik" className="scroll-mt-20 py-16 md:scroll-mt-24 md:py-lp-section">
          <Container>
            <SectionHeading id="oda-baslik" title="Odada neler var" intro="Bir çalışma odası, birlikte çalışmayı kolaylaştıran şeylerle gelir. Hepsi odaya girdiğin anda hazır." />
            <div className="mt-12 grid gap-5 md:mt-16 lg:grid-cols-3">
              {benefitRows.map((row) =>
                row.map((benefit) =>
                  benefit.figure ? <WideBenefit key={benefit.title} benefit={benefit} /> : <NarrowBenefit key={benefit.title} benefit={benefit} />,
                ),
              )}
            </div>
          </Container>
        </section>

        {/* ── Nasıl çalışır: gerçek bir sıra ── */}
        <section id="nasil" aria-labelledby="nasil-baslik" className="scroll-mt-20 border-y-2 border-lp-ink bg-lp-peach py-16 md:scroll-mt-24 md:py-lp-section">
          <Container>
            <SectionHeading id="nasil-baslik" tone="ink" title="Üç adımda çalışma odası" intro="Kurulum yok, takvim ayarlamak yok. Odaya girersin, odaklanırsın; gerisi herkes için aynı anda işler." />
            <ol className="mt-12 md:mt-16">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                    <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                      <p className="font-lp-label text-lp-label font-black uppercase">{index + 1}. adım</p>
                      <h3 className={`${lpH3} mt-3`}>{step.title}</h3>
                      <p className="mt-4 max-w-[30rem] text-lp-lg font-medium">{step.text}</p>
                    </div>
                    <div className={`${lpBox} ${step.surface} p-5 shadow-lp-lg sm:p-8 lg:p-12 ${index % 2 === 1 ? 'md:order-1' : ''}`}>{step.figure}</div>
                  </div>
                  {index < steps.length - 1 ? <HandArrow flip={index % 2 === 1} className="mx-auto my-6 h-20 w-24 md:my-4 md:h-28 md:w-32" /> : null}
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ── Fiyat ── */}
        <section id="fiyat" aria-labelledby="fiyat-baslik" className="scroll-mt-20 py-16 md:scroll-mt-24 md:py-lp-section">
          <Container>
            <SectionHeading id="fiyat-baslik" title="Ücretsiz başla" intro="Birlikte çalışmak için gereken her şey ücretsiz. Kendi odanı kurmak ve kameralı odalar için Premium var." />
            <div className="mx-auto mt-12 grid max-w-[60rem] gap-5 md:mt-16 md:grid-cols-2">
              <PriceCard
                surface="bg-lp-lemon"
                name="Ücretsiz"
                description="Odalara katıl, birlikte çalış, ilerlemeni takip et."
                price="₺0"
                features={freeFeatures}
                action={
                  <Link to={primary.to} className={`${lpButton} w-full`}>
                    {primary.label}
                  </Link>
                }
              />
              <PriceCard
                surface="bg-lp-mint"
                name="Premium"
                description="Kendi odanı kur, kameralı çalış, Elite odalara gir."
                price="₺49"
                period="/ ay"
                note="ya da yıllık ₺499 (aylığa göre yılda ₺89 daha az)"
                features={premiumFeatures}
                action={
                  <Link to={premiumTo} className={`${lpButton} w-full`}>
                    Premium'a geç
                  </Link>
                }
              />
            </div>
            <p className="mx-auto mt-8 max-w-[37rem] text-center text-lp-sm font-medium text-lp-muted">
              Premium dönemlik alınır, otomatik yenilenmez. Süre bitince hesabın ücretsiz plana döner; verilerin yerinde kalır.
            </p>
          </Container>
        </section>

        {/* ── Sorular ── */}
        <section id="sss" aria-labelledby="sss-baslik" className="scroll-mt-20 py-16 md:scroll-mt-24 md:py-lp-section">
          <Container>
            <SectionHeading id="sss-baslik" title="Sık sorulanlar" />
            <div className="mx-auto mt-12 max-w-lp-narrow space-y-5 md:mt-16">
              {faqs.map((faq) => (
                <details key={faq.q} className={`${lpBox} group bg-lp-card shadow-lp-md`}>
                  <summary
                    className={`${lpFocus} flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden`}
                  >
                    <span className={`${lpH4}`}>{faq.q}</span>
                    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-lp-ink bg-lp-mustard transition-transform group-open:rotate-90">
                      <ChevronRight className="h-5 w-5" />
                    </span>
                  </summary>
                  <p className="border-t-2 border-lp-ink px-5 py-4 text-lp-base font-medium text-lp-muted">{faq.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Son çağrı ── */}
        <section aria-labelledby="son-baslik" className="pb-16 md:pb-lp-section">
          <Container>
            <div className={`${lpBox} bg-lp-lemon px-6 py-12 text-center shadow-lp-lg md:px-16 md:py-16`}>
              <h2 id="son-baslik" className={`${lpHeading} text-lp-h2-sm md:text-lp-h2`}>
                Bu akşam bir masa boş.
              </h2>
              <p className="mx-auto mt-4 max-w-[32rem] text-lp-lg font-medium">Hesap açmak bir dakika sürer. E-postanı doğrularsın, ilk odana girersin.</p>
              <Link to={primary.to} className={`${lpButton} mt-8 w-full sm:w-auto`}>
                {primary.label}
              </Link>
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t-2 border-lp-ink bg-lp-mint">
        <Container className="py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <Link to="/" className={`${lpFocus} self-start`} aria-label="StudyLounge ana sayfa">
              <LandingLockup size="sm" />
            </Link>
            <nav aria-label="Alt bilgi">
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={`${lpFocus} inline-flex min-h-11 items-center text-lp-sm font-bold hover:underline`}>
                      {link.label}
                    </a>
                  </li>
                ))}
                {!isAuthenticated ? (
                  <li>
                    <Link to="/auth" className={`${lpFocus} inline-flex min-h-11 items-center text-lp-sm font-bold hover:underline`}>
                      Giriş yap
                    </Link>
                  </li>
                ) : null}
              </ul>
            </nav>
          </div>
          <p className="mt-8 border-t-2 border-lp-ink pt-6 text-lp-sm font-medium">Enes İlbay tarafından mezuniyet projesi olarak geliştirildi, {new Date().getFullYear()}.</p>
        </Container>
      </footer>
    </div>
  );
}

function SiteHeader({ isAuthenticated, primary }: { isAuthenticated: boolean; primary: { to: string; label: string } }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-lp-ink bg-lp-paper">
      <Container className="flex h-[72px] items-center justify-between gap-4 md:h-[88px]">
        <Link to="/" className={lpFocus} aria-label="StudyLounge ana sayfa">
          <LandingLockup />
        </Link>

        <nav aria-label="Sayfa içi" className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className={`${lpFocus} text-lp-base font-bold hover:underline`}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <Link to="/auth" className={`${lpFocus} hidden min-h-11 items-center px-2 text-lp-base font-bold hover:underline md:inline-flex`}>
              Giriş yap
            </Link>
          ) : null}
          <Link to={primary.to} className={`hidden sm:inline-flex ${lpButtonSm}`}>
            {primary.label}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobil-menu"
            aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            className={`${lpBox} ${lpFocus} grid h-11 w-11 place-items-center bg-lp-card shadow-lp-xs lg:hidden`}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </Container>

      {menuOpen ? (
        <div id="mobil-menu" className="border-t-2 border-lp-ink bg-lp-paper lg:hidden">
          <Container className="py-5">
            <nav aria-label="Menü">
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} onClick={close} className={`${lpFocus} flex min-h-12 items-center ${lpHeading} text-lp-h4`}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-5 flex flex-col gap-3 border-t-2 border-lp-ink pt-5">
              <Link to={primary.to} onClick={close} className={`${lpButton} w-full`}>
                {primary.label}
              </Link>
              {!isAuthenticated ? (
                <Link to="/auth" onClick={close} className={`${lpTextLink} justify-center`}>
                  Giriş yap
                </Link>
              ) : null}
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

function WideBenefit({ benefit }: { benefit: Benefit }) {
  return (
    <article className={`${lpBox} ${benefit.surface} grid items-center gap-8 p-6 shadow-lp-md sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:col-span-2 lg:p-10`}>
      <div>
        <h3 className={lpH3}>{benefit.title}</h3>
        <p className="mt-4 text-lp-base font-medium md:text-lp-lg">{benefit.text}</p>
        {benefit.detail ? <p className="mt-3 text-lp-sm font-medium">{benefit.detail}</p> : null}
      </div>
      {benefit.figure}
    </article>
  );
}

function NarrowBenefit({ benefit }: { benefit: Benefit }) {
  return (
    <article className={`${lpBox} flex flex-col bg-lp-card p-6 shadow-lp-md sm:p-8 lg:p-10`}>
      <h3 className={lpH3}>{benefit.title}</h3>
      <p className="mt-4 text-lp-base font-medium text-lp-muted md:text-lp-lg">{benefit.text}</p>
    </article>
  );
}

function PriceCard({
  surface,
  name,
  description,
  price,
  period,
  note,
  features,
  action,
}: {
  surface: string;
  name: string;
  description: string;
  price: string;
  period?: string;
  note?: string;
  features: string[];
  action: ReactNode;
}) {
  return (
    <article className={`${lpBox} ${surface} flex flex-col p-6 shadow-lp-md sm:p-8`}>
      <h3 className={lpH3}>{name}</h3>
      <p className="mt-3 text-lp-base font-medium">{description}</p>
      <p className="mt-8 flex items-baseline gap-2">
        <span className="font-lp-sans text-[3rem] font-black leading-none tracking-lp">{price}</span>
        {period ? <span className={`${lpHeading} text-lp-h4`}>{period}</span> : null}
      </p>
      <p className="mt-2 min-h-6 text-lp-sm font-medium">{note}</p>
      <p className={`${lpHeading} mt-8 text-lp-sm`}>İçindekiler:</p>
      <ul className="mt-3 flex-1 space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-lp-base font-medium">
            <Asterisk className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-8">{action}</div>
    </article>
  );
}
