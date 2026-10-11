import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, Menu, Target, Trophy, Video, X, type LucideIcon } from 'lucide-react';
import { ProductShot } from '../components/landing/ProductShot';
import { FadeIn, Reveal, WordReveal } from '../components/landing/Motion';
import { LandingMark } from '../components/landing/Brutal';
import { MbContainer, MbPill, MbSectionTitle, MbShot } from '../components/landing-mobilo/Parts';
import { mbButton, mbButtonDark, mbDisplay, mbFocus } from '../components/landing-mobilo/styles';
import { Accordion, Float, Lift, Marquee, Parallax, ProgressLine, RiseLetters, ScrollProgress, Spotlight, SwapText } from '../components/landing-mobilo/Effects';
import {
  benefitRows,
  benefitSection,
  closing,
  faqSection,
  faqs,
  footer,
  hero,
  navLinks,
  plans,
  pricingSection,
  problemSection,
  problems,
  stepSection,
  steps,
} from '../components/landing/content';
import { useAuthStore } from '../store/authStore';

/*
 * Açılış sayfası, Mobilo denemesi (ozellik/acilis-mobilo). Didasko sürümüyle
 * aynı içerik (content.ts); yalnızca biçim dili farklı. Bütün ürün görselleri
 * gerçek uygulamadan, demo hesaplarla alınmış ekran kesitleridir.
 */

const [timerBenefit, noCameraBenefit] = benefitRows[0];
const [goalsBenefit, boardBenefit] = benefitRows[1];
const [cameraBenefit, leagueBenefit] = benefitRows[2];

/** Görseli olmayan özellikler: kısa kart + ikon. */
const smallBenefits: Array<{ title: string; text: string; icon: LucideIcon }> = [
  { title: goalsBenefit.title, text: goalsBenefit.text, icon: Target },
  { title: cameraBenefit.title, text: cameraBenefit.text, icon: Video },
  { title: leagueBenefit.title, text: leagueBenefit.text, icon: Trophy },
];

/** Adım görselleri: uygulamadan gerçek kesitler. */
/** Giriş altındaki kayan şerit: uygulamada gerçekten olan özellikler. */
const featureStrip = ['Ortak sayaç', 'PDF tahtası', 'Kamera isteğe bağlı', 'Haftalık lig', 'Dersler ve hedefler', 'Oda sohbeti', 'Ortam sesleri', 'Planlı oturumlar'];

const stepShots = [
  { src: '/landing/oda-kategoriler.webp', width: 1200, height: 168, alt: 'Odalar sayfası: oda arama kutusu ve Bilgisayar Bilimi, Tıp ve Sağlık, Hukuk, Sınav Hazırlık gibi konu filtreleri.' },
  { src: '/landing/oda-odaklan.webp', width: 1045, height: 200, alt: 'Oda içindeki sayaç: 25:00, süre seçenekleri, Odayla başlat bağlantısı ve Odaklan düğmesi.' },
  { src: '/landing/oda-sohbet.webp', width: 745, height: 650, alt: 'Oda sohbeti: Ali "Herkese kolay gelsin, ilk turdan sonra 5 dk mola." ve Zeynep "Biyokimya 3. ünite bitene kadar buradayım." yazmış.' },
];

export default function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const primary = isAuthenticated ? { to: '/app/lobbies', label: 'Odalara git' } : { to: '/auth?mod=kayit', label: 'Ücretsiz hesap aç' };
  const premiumTo = isAuthenticated ? '/app/premium' : '/auth?mod=kayit';
  const [yearly, setYearly] = useState(false);

  return (
    // LazyMotion: framer-motion'ın yalnızca kullanılan özellikleri yüklenir (animasyonlar sadece bu sayfada).
    <LazyMotion features={domAnimation} strict>
      {/* Geçici logo (LandingMark) lp-* renklerini kullanır; burada Mobilo yeşiline çevrilir. */}
      <div className="min-h-screen overflow-x-clip bg-mb-bg font-mb-body text-mb-ink [--color-lp-action:var(--color-mb-action-2)]">
        <a href="#icerik" className={`${mbFocus} sr-only rounded-lg bg-mb-action px-4 py-2 font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50`}>
          İçeriğe geç
        </a>

        <ScrollProgress />
        <SiteHeader isAuthenticated={isAuthenticated} primary={primary} />

        <main id="icerik">
          {/* ── Giriş ── */}
          <section aria-labelledby="giris-baslik" className="relative -mt-24 bg-mb-band bg-[linear-gradient(90deg,var(--color-mb-grid)_1px,transparent_1px)] bg-[size:88px_100%] pb-20 pt-40 md:-mt-28 md:pt-48">
            <Spotlight>
            <MbContainer className="relative text-center">
              <FadeIn>
                <MbPill>{hero.tag}</MbPill>
              </FadeIn>
              <h1 id="giris-baslik" className={`${mbDisplay} mx-auto mt-6 max-w-[54rem] text-balance text-[2.75rem] leading-[1.08] md:text-[4.5rem]`}>
                <WordReveal text={hero.title} delay={0.15} />
              </h1>
              <FadeIn delay={0.55}>
                <p className="mx-auto mt-6 max-w-[40rem] text-base leading-[1.8] text-mb-body md:text-lg">{hero.intro}</p>
                <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Link to={primary.to} className={`${mbButton} group pr-2`}>
                    {primary.label}
                    <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-[10px] bg-mb-bg text-mb-action">
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                  <a href="#nasil" className={mbButtonDark}>
                    {hero.secondary}
                  </a>
                </div>
                <p className="mt-5 text-sm text-mb-body">{hero.reassurance}</p>
              </FadeIn>

              <div className="relative mx-auto mt-10 max-w-[75rem] text-left md:mt-12">
                {/* Lamba ışığı: görüntünün arkasında tek sıcak ışık kaynağı */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-24 -top-24 bottom-1/3 rounded-full opacity-70 blur-3xl"
                  style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-action-2) 30%, transparent), transparent)' }}
                />
                <div className="relative">
                  <ProductShot variant="soft" />
                </div>
              </div>
            </MbContainer>
            </Spotlight>
            <FadeIn delay={1.2} className="mt-16">
              <h2 className="sr-only">Özellikler</h2>
              <Marquee items={featureStrip} />
            </FadeIn>
          </section>

          {/* ── Sorun ── */}
          <section aria-labelledby="sorun-baslik" className="py-20 md:py-28">
            <MbContainer>
              <MbSectionTitle id="sorun-baslik" pill="Neden zor?" title={problemSection.title} intro={problemSection.intro} />
              <ul className="mt-14 grid gap-6 md:grid-cols-3">
                {problems.map((problem, index) => (
                  <Reveal as="li" key={problem.title} delay={index * 0.12}>
                    <Lift className="flex flex-col rounded-[24px] bg-mb-surface p-6 transition-shadow duration-300 hover:shadow-mb-card md:p-7">
                    <h3 className="font-mb-display text-[1.625rem] font-normal leading-tight tracking-[-0.03em]">{problem.title}</h3>
                    <p className="mt-3 flex-1 leading-[1.8] text-mb-body">{problem.text}</p>
                    <div className="mt-6 grid h-40 place-items-center rounded-[16px] bg-mb-bg shadow-mb-card">
                      <span className="grid h-20 w-20 place-items-center rounded-full bg-mb-tint transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                        <problem.icon className="h-9 w-9 text-mb-action" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                    </div>
                    </Lift>
                  </Reveal>
                ))}
              </ul>
            </MbContainer>
          </section>

          {/* ── Odada neler var ── */}
          <section id="oda" aria-labelledby="oda-baslik" className="scroll-mt-28 py-20 md:py-28">
            <MbContainer>
              <MbSectionTitle id="oda-baslik" pill="Odada neler var" title={benefitSection.title} intro={benefitSection.intro} />
              <div className="mt-14 grid gap-6 lg:grid-cols-2">
                <FeatureCard title={timerBenefit.title} text={timerBenefit.text} detail={timerBenefit.detail} from="left">
                  <MbShot src="/landing/oda-sayac.webp" width={760} height={250} alt="Ortak sayaç: 24:51, Odak, Elif Kaya başlattı; duraklat, bitir ve Ayrıl düğmeleri." />
                </FeatureCard>
                <FeatureCard title={boardBenefit.title} text={boardBenefit.text} detail={boardBenefit.detail} from="right">
                  <MbShot src="/landing/oda-tahta.webp" width={1200} height={724} alt="Ortak PDF tahtası: Fizik 101 ders notunda F = m · a formülü fosforlu kalemle işaretlenmiş, cevap 3 m/s² yuvarlak içine alınmış." />
                </FeatureCard>
                <Reveal as="article" className="lg:col-span-2">
                  <Lift className="grid items-center gap-8 rounded-[24px] bg-mb-surface p-6 md:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div>
                    <h3 className={`${mbDisplay} text-[1.75rem] font-normal leading-tight md:text-[2rem]`}>{noCameraBenefit.title}</h3>
                    <p className="mt-4 leading-[1.8] text-mb-body">{noCameraBenefit.text}</p>
                  </div>
                  <MbShot src="/landing/oda-masalar.webp" width={1200} height={503} alt="Oda masaları: Elif, Ali ve Zeynep odakta, Deniz molada. Kamera yok; kim odakta, kim molada yazıyor." />
                  </Lift>
                </Reveal>
              </div>
              <ul className="mt-6 grid gap-6 md:grid-cols-3">
                {smallBenefits.map((benefit, index) => (
                  <Reveal as="li" key={benefit.title} delay={index * 0.1}>
                    <Lift className="rounded-[24px] border border-mb-line bg-mb-bg p-6 shadow-mb-card transition-shadow duration-300 hover:shadow-mb-shot">
                    <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-mb-tint text-mb-action transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                      <benefit.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-mb-display text-xl font-normal tracking-[-0.02em]">{benefit.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-[1.75] text-mb-body">{benefit.text}</p>
                    </Lift>
                  </Reveal>
                ))}
              </ul>
            </MbContainer>
          </section>

          {/* ── Nasıl çalışır ── */}
          <section id="nasil" aria-labelledby="nasil-baslik" className="scroll-mt-28 bg-mb-surface py-20 md:py-28">
            <MbContainer>
              <MbSectionTitle id="nasil-baslik" pill="Nasıl çalışır" title={stepSection.title} intro={stepSection.intro} />
              <ol className="relative mt-14 space-y-16 md:space-y-24">
                <ProgressLine className="inset-y-0 left-1/2 hidden md:block" />
                {steps.map((step, index) => {
                  const shot = stepShots[index];
                  const flip = index % 2 === 1;
                  return (
                    <li key={step.title} className="relative grid items-center gap-8 md:grid-cols-2 md:gap-16">
                      <StepDot />
                      <Reveal from={flip ? 'right' : 'left'} className={flip ? 'md:order-2' : ''}>
                        <p className="font-mb-body text-sm font-medium text-mb-body">{index + 1}. adım</p>
                        <h3 className={`${mbDisplay} mt-2 text-[2rem] leading-tight md:text-[2.5rem]`}>{step.title}</h3>
                        <p className="mt-4 max-w-[32rem] leading-[1.8] text-mb-body md:text-lg">{step.text}</p>
                      </Reveal>
                      <Reveal from={flip ? 'left' : 'right'} delay={0.12} className={`rounded-[24px] bg-mb-bg p-4 shadow-mb-card md:p-6 ${flip ? 'md:order-1' : ''}`}>
                        <Parallax distance={18}>
                          <MbShot src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} className={index === 2 ? 'mx-auto max-w-[24rem]' : ''} />
                        </Parallax>
                      </Reveal>
                    </li>
                  );
                })}
              </ol>
            </MbContainer>
          </section>

          {/* ── Fiyat ── */}
          <section id="fiyat" aria-labelledby="fiyat-baslik" className="scroll-mt-28 py-20 md:py-28">
            <MbContainer>
              <MbSectionTitle id="fiyat-baslik" pill="Fiyat" title={pricingSection.title} intro={pricingSection.intro} />
              <div className="mt-10 flex justify-center">
                <div role="radiogroup" aria-label="Premium ödeme dönemi" className="relative grid grid-cols-2 rounded-full bg-mb-surface p-1.5">
                  {/* Seçim göstergesi: seçilen seçeneğin altına kayar. */}
                  <m.span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-full bg-mb-ink shadow-mb-raised"
                    initial={false}
                    animate={{ x: yearly ? '100%' : '0%' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                  {[
                    { value: false, label: 'Aylık' },
                    { value: true, label: 'Yıllık' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={yearly === option.value}
                      onClick={() => setYearly(option.value)}
                      className={`${mbFocus} relative min-h-11 rounded-full px-7 text-[0.9375rem] font-medium transition-colors duration-300 ${yearly === option.value ? 'text-mb-bg' : 'text-mb-body hover:text-mb-ink'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mx-auto mt-10 grid max-w-[64rem] gap-6 md:grid-cols-2">
                <PriceCard name={plans.free.name} description={plans.free.description} price={plans.free.price} period="/ her zaman" features={plans.free.features} cta={{ to: primary.to, label: primary.label }} delay={0} />
                <PriceCard
                  highlighted
                  name={plans.premium.name}
                  description={plans.premium.description}
                  price={yearly ? '₺499' : plans.premium.price}
                  period={yearly ? '/ yıl' : plans.premium.period}
                  note={yearly ? 'Aylığa göre yılda ₺89 daha az' : 'Yıllık alırsan ₺499'}
                  features={plans.premium.features}
                  cta={{ to: premiumTo, label: plans.premium.action }}
                  delay={0.12}
                />
              </div>
              <p className="mx-auto mt-8 max-w-[38rem] text-center text-sm leading-[1.7] text-mb-body">{pricingSection.footnote}</p>
            </MbContainer>
          </section>

          {/* ── Sorular ── */}
          <section id="sss" aria-labelledby="sss-baslik" className="scroll-mt-28 bg-mb-surface py-20 md:py-28">
            <MbContainer>
              <MbSectionTitle id="sss-baslik" pill="Sorular" title={faqSection.title} />
              <div className="mx-auto mt-12 max-w-[50rem] space-y-3">
                {faqs.map((faq, index) => (
                  <Reveal key={faq.q} delay={index * 0.05}>
                    <Accordion question={faq.q} answer={faq.a} />
                  </Reveal>
                ))}
              </div>
            </MbContainer>
          </section>

          {/* ── Son çağrı ── */}
          <section aria-labelledby="son-baslik" className="py-20 md:py-28">
            <MbContainer>
              <Reveal className="relative overflow-hidden rounded-[28px] bg-mb-band bg-[linear-gradient(90deg,var(--color-mb-grid)_1px,transparent_1px)] bg-[size:88px_100%] px-6 py-16 text-center md:px-16 md:py-24">
                <Float className="pointer-events-none absolute -left-10 top-10 hidden w-64 lg:block" amplitude={12} duration={7}>
                  <img src="/landing/oda-sohbet.webp" alt="" width={745} height={650} loading="lazy" className="block h-auto w-full -rotate-6 rounded-[16px] shadow-mb-shot" />
                </Float>
                <Float className="pointer-events-none absolute -right-12 bottom-14 hidden w-80 lg:block" amplitude={10} duration={8} delay={1.5}>
                  <img src="/landing/oda-sayac.webp" alt="" width={760} height={250} loading="lazy" className="block h-auto w-full rotate-6 rounded-[16px] shadow-mb-shot" />
                </Float>
                <div className="relative mx-auto max-w-[36rem]">
                  <h2 id="son-baslik" className={`${mbDisplay} text-balance text-[2.25rem] leading-[1.1] md:text-[3.25rem]`}>
                    {closing.title}
                  </h2>
                  <p className="mt-5 leading-[1.8] text-mb-body md:text-lg">{closing.text}</p>
                  <Link to={primary.to} className={`${mbButton} group mt-8 pr-2`}>
                    {primary.label}
                    <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-[10px] bg-mb-bg text-mb-action">
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
              </Reveal>
            </MbContainer>
          </section>
        </main>

        <footer className="relative overflow-hidden bg-mb-ink text-mb-bg [--color-lp-ink:var(--color-mb-bg)]">
          <p aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-[0.18em] select-none whitespace-nowrap text-center font-mb-display text-[16.5vw] font-semibold leading-none tracking-[-0.06em] text-mb-bg/[0.07]">
            <RiseLetters text="StudyLounge" />
          </p>
          <MbContainer className="relative py-16">
            <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                <Link to="/" className={`${mbFocus} inline-flex items-center gap-2.5`} aria-label="StudyLounge ana sayfa">
                  <LandingMark className="h-9 w-9" />
                  <span className="font-mb-display text-2xl font-medium tracking-[-0.03em]">StudyLounge</span>
                </Link>
                <p className="mt-4 max-w-[28rem] leading-[1.8] text-mb-bg/70">{hero.intro}</p>
              </div>
              <nav aria-label="Alt bilgi">
                <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} className={`${mbFocus} inline-flex min-h-11 items-center text-mb-bg/85 hover:text-mb-bg`}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                  {!isAuthenticated ? (
                    <li>
                      <Link to="/auth" className={`${mbFocus} inline-flex min-h-11 items-center text-mb-bg/85 hover:text-mb-bg`}>
                        Giriş yap
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </nav>
            </div>
            <p className="mt-14 border-t border-mb-bg/15 pt-6 text-sm text-mb-bg/70">{footer.credit(new Date().getFullYear())}</p>
          </MbContainer>
        </footer>
      </div>
    </LazyMotion>
  );
}

function SiteHeader({ isAuthenticated, primary }: { isAuthenticated: boolean; primary: { to: string; label: string } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Kaydırınca çubuk incelir ve gölgesi belirginleşir.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-5">
      <div className={`mx-auto max-w-[62.5rem] rounded-[22px] border border-mb-line bg-mb-bg/90 backdrop-blur transition-shadow duration-300 ${scrolled || menuOpen ? 'shadow-mb-raised' : 'shadow-mb-card'}`}>
        <div className={`flex items-center justify-between gap-4 pl-5 pr-2.5 transition-[height] duration-300 ${scrolled ? 'h-14 md:h-16' : 'h-16 md:h-[76px]'}`}>
          <Link to="/" className={`${mbFocus} flex items-center gap-2`} aria-label="StudyLounge ana sayfa">
            <LandingMark className="h-8 w-8" />
            <span className="font-mb-display text-xl font-medium tracking-[-0.03em]">StudyLounge</span>
          </Link>

          <nav aria-label="Sayfa içi" className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className={`${mbFocus} text-[0.9375rem] text-mb-body transition hover:text-mb-ink`}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <Link to="/auth" className={`${mbFocus} hidden min-h-11 items-center px-3 text-[0.9375rem] text-mb-body hover:text-mb-ink md:inline-flex`}>
                Giriş yap
              </Link>
            ) : null}
            {/* Düğme stili inline-flex içerdiği için gizleme dıştaki kaba verilir. */}
            <span className="hidden sm:block">
              <Link to={primary.to} className={`${mbButton} min-h-11 px-5 text-[0.9375rem]`}>
                {primary.label}
              </Link>
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobil-menu"
              aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              className={`${mbFocus} grid h-11 w-11 place-items-center rounded-[12px] border border-mb-line bg-mb-surface lg:hidden`}
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <m.div
              id="mobil-menu"
              key="mobil-menu"
              className="overflow-hidden border-t border-mb-line lg:hidden"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="px-5 py-5">
                <nav aria-label="Menü">
                  <ul className="space-y-1">
                    {navLinks.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} onClick={close} className={`${mbFocus} flex min-h-12 items-center font-mb-display text-xl tracking-[-0.02em]`}>
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="mt-5 flex flex-col gap-3 border-t border-mb-line pt-5">
                  <Link to={primary.to} onClick={close} className={`${mbButton} w-full`}>
                    {primary.label}
                  </Link>
                  {!isAuthenticated ? (
                    <Link to="/auth" onClick={close} className={`${mbFocus} inline-flex min-h-11 items-center justify-center text-mb-body`}>
                      Giriş yap
                    </Link>
                  ) : null}
                </div>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}

function FeatureCard({ title, text, detail, from, children }: { title: string; text: string; detail?: string; from: 'left' | 'right'; children: ReactNode }) {
  return (
    <Reveal as="article" from={from}>
      <Lift className="flex flex-col rounded-[24px] bg-mb-surface p-6 md:p-8">
      <h3 className={`${mbDisplay} text-[1.75rem] font-normal leading-tight md:text-[2rem]`}>{title}</h3>
      <p className="mt-4 leading-[1.8] text-mb-body">{text}</p>
      {detail ? <p className="mt-2 text-sm leading-[1.7] text-mb-body">{detail}</p> : null}
      <div className="mt-8 flex flex-1 items-end">{children}</div>
      </Lift>
    </Reveal>
  );
}

function PriceCard({
  name,
  description,
  price,
  period,
  note,
  features,
  cta,
  highlighted = false,
  delay,
}: {
  name: string;
  description: string;
  price: string;
  period?: string;
  note?: string;
  features: string[];
  cta: { to: string; label: string };
  highlighted?: boolean;
  delay: number;
}) {
  return (
    <Reveal
      as="article"
      delay={delay}
      className={`relative flex flex-col overflow-hidden rounded-[24px] p-6 md:p-8 ${highlighted ? 'border border-mb-action/40 bg-mb-bg shadow-mb-shot' : 'bg-mb-surface'}`}
    >
      {highlighted ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-2xl"
          style={{ background: 'radial-gradient(closest-side, var(--color-mb-tint), transparent)' }}
        />
      ) : null}
      <div className="relative">
        <h3 className="font-mb-display text-2xl tracking-[-0.03em]">{name}</h3>
        <p className="mt-2 text-[0.9375rem] leading-[1.7] text-mb-body">{description}</p>
        <p className="mt-7 flex items-baseline gap-2">
          <SwapText value={price} className={`${mbDisplay} text-[3rem] leading-none tabular-nums`} />
          {period ? <SwapText value={period} className="text-mb-body" /> : null}
        </p>
        <p className="mt-2 min-h-6 text-sm text-mb-body">{note ? <SwapText value={note} /> : null}</p>
        <Link to={cta.to} className={`${highlighted ? mbButton : mbButtonDark} mt-6 w-full`}>
          {cta.label}
        </Link>
        <p className="mt-8 text-sm font-medium">İçindekiler</p>
        <ul className="mt-3 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex gap-3 text-[0.9375rem] leading-[1.6]">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mb-tint">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

/** Adım ortasındaki nokta: görünüme girince yaylanarak belirir (dolan çizginin üstünde). */
function StepDot() {
  const reduce = useReducedMotion();
  return (
    <m.span
      aria-hidden="true"
      className="absolute left-[calc(50%-0.5rem)] top-[calc(50%-0.5rem)] hidden h-4 w-4 rounded-full bg-mb-action ring-[6px] ring-mb-surface md:block"
      initial={reduce ? false : { scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -40% 0px' }}
      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
    />
  );
}
