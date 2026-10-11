import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Asterisk, ChevronRight, Menu, X } from 'lucide-react';
import { ProductShot } from '../components/landing/ProductShot';
import { FadeIn, Reveal, WordReveal } from '../components/landing/Motion';
import { BoardFigure, BreakFigure, CameraFigure, PhoneOnDesk, RoomListFigure, TimerRhythm } from '../components/landing/Figures';
import { Container, HandArrow, LandingLockup, SectionHeading, Tag } from '../components/landing/Brutal';
import { lpBox, lpButton, lpButtonSm, lpFocus, lpH1, lpH3, lpH4, lpHeading, lpPaper, lpTextLink } from '../components/landing/styles';
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
  type Benefit,
  type FigureKey,
} from '../components/landing/content';
import { useAuthStore } from '../store/authStore';

/** İçerikteki şekil anahtarlarının bu sürümdeki çizimleri. */
const figures: Record<FigureKey, ReactNode> = {
  timer: <TimerRhythm />,
  board: <BoardFigure />,
  camera: <CameraFigure />,
  rooms: <RoomListFigure />,
  phone: <PhoneOnDesk />,
  break: <BreakFigure />,
};

/** Geniş fayda kartlarının ve adım çizimlerinin zemin rengi, sırayla. */
const benefitSurfaces: Partial<Record<FigureKey, string>> = { timer: 'bg-lp-lemon', board: 'bg-lp-mint', camera: 'bg-lp-peach' };
const stepSurfaces = ['bg-lp-lemon', 'bg-lp-mint', 'bg-lp-card'];

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
            <FadeIn>
              <Tag>{hero.tag}</Tag>
            </FadeIn>
            <h1 id="giris-baslik" className={`${lpH1} mx-auto mt-7 max-w-[56rem] text-balance`}>
              <WordReveal text={hero.title} delay={0.15} />
            </h1>
            <FadeIn delay={0.55}>
            <p className="mx-auto mt-5 max-w-[37rem] text-lp-lg font-medium text-lp-muted">
              {hero.intro}
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-8">
              <Link to={primary.to} className={lpButton}>
                {primary.label}
              </Link>
              <a href="#nasil" className={`${lpTextLink} justify-center`}>
                {hero.secondary} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-5 text-lp-sm font-medium text-lp-muted">{hero.reassurance}</p>
            </FadeIn>

            <FadeIn delay={0.8} className="mx-auto mt-12 max-w-[62.5rem] text-left md:mt-[60px]">
              <ProductShot />
            </FadeIn>
          </Container>
        </section>

        {/* ── Sorun ── */}
        <section aria-labelledby="sorun-baslik" className="py-16 md:py-lp-section">
          <Container>
            <SectionHeading id="sorun-baslik" title={problemSection.title} intro={problemSection.intro} />
            <ul className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3">
              {problems.map((problem, index) => (
                <Reveal as="li" key={problem.title} delay={index * 0.12} className={`${lpBox} bg-lp-card px-6 py-8 text-center shadow-lp-md md:px-7`}>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-lp-ink bg-lp-peach">
                    <problem.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className={`${lpH3} mt-5`}>{problem.title}</h3>
                  <p className="mt-3 text-lp-base font-medium text-lp-muted">{problem.text}</p>
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>

        {/* ── Odada neler var (bento) ── */}
        <section id="oda" aria-labelledby="oda-baslik" className="scroll-mt-20 py-16 md:scroll-mt-24 md:py-lp-section">
          <Container>
            <SectionHeading id="oda-baslik" title={benefitSection.title} intro={benefitSection.intro} />
            <div className="mt-12 grid gap-5 md:mt-16 lg:grid-cols-3">
              {benefitRows.map((row) =>
                row.map((benefit, column) =>
                  benefit.figure ? (
                    <WideBenefit key={benefit.title} benefit={benefit} from={column === 0 ? 'left' : 'right'} />
                  ) : (
                    <NarrowBenefit key={benefit.title} benefit={benefit} from={column === 0 ? 'left' : 'right'} />
                  ),
                ),
              )}
            </div>
          </Container>
        </section>

        {/* ── Nasıl çalışır: gerçek bir sıra ── */}
        <section id="nasil" aria-labelledby="nasil-baslik" className="scroll-mt-20 border-y-2 border-lp-ink bg-lp-peach py-16 md:scroll-mt-24 md:py-lp-section">
          <Container>
            <SectionHeading id="nasil-baslik" tone="ink" title={stepSection.title} intro={stepSection.intro} />
            <ol className="mt-12 md:mt-16">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                    <Reveal from={index % 2 === 1 ? 'right' : 'left'} className={index % 2 === 1 ? 'md:order-2' : ''}>
                      <p className="font-lp-label text-lp-label font-black uppercase">{index + 1}. adım</p>
                      <h3 className={`${lpH3} mt-3`}>{step.title}</h3>
                      <p className="mt-4 max-w-[30rem] text-lp-lg font-medium">{step.text}</p>
                    </Reveal>
                    <Reveal
                      from={index % 2 === 1 ? 'left' : 'right'}
                      delay={0.12}
                      className={`${lpBox} ${stepSurfaces[index % stepSurfaces.length]} p-5 shadow-lp-lg sm:p-8 lg:p-12 ${index % 2 === 1 ? 'md:order-1' : ''}`}
                    >
                      {figures[step.figure]}
                    </Reveal>
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
            <SectionHeading id="fiyat-baslik" title={pricingSection.title} intro={pricingSection.intro} />
            <div className="mx-auto mt-12 grid max-w-[60rem] gap-5 md:mt-16 md:grid-cols-2">
              <PriceCard
                delay={0}
                surface="bg-lp-lemon"
                name={plans.free.name}
                description={plans.free.description}
                price={plans.free.price}
                features={plans.free.features}
                action={
                  <Link to={primary.to} className={`${lpButton} w-full`}>
                    {primary.label}
                  </Link>
                }
              />
              <PriceCard
                delay={0.12}
                surface="bg-lp-mint"
                name={plans.premium.name}
                description={plans.premium.description}
                price={plans.premium.price}
                period={plans.premium.period}
                note={plans.premium.note}
                features={plans.premium.features}
                action={
                  <Link to={premiumTo} className={`${lpButton} w-full`}>
                    {plans.premium.action}
                  </Link>
                }
              />
            </div>
            <p className="mx-auto mt-8 max-w-[37rem] text-center text-lp-sm font-medium text-lp-muted">
              {pricingSection.footnote}
            </p>
          </Container>
        </section>

        {/* ── Sorular ── */}
        <section id="sss" aria-labelledby="sss-baslik" className="scroll-mt-20 py-16 md:scroll-mt-24 md:py-lp-section">
          <Container>
            <SectionHeading id="sss-baslik" title={faqSection.title} />
            <div className="mx-auto mt-12 max-w-lp-narrow space-y-5 md:mt-16">
              {faqs.map((faq, index) => (
                <Reveal key={faq.q} delay={index * 0.06}>
                <details className={`${lpBox} group bg-lp-card shadow-lp-md`}>
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
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Son çağrı ── */}
        <section aria-labelledby="son-baslik" className="pb-16 md:pb-lp-section">
          <Container>
            <Reveal className={`${lpBox} bg-lp-lemon px-6 py-12 text-center shadow-lp-lg md:px-16 md:py-16`}>
              <h2 id="son-baslik" className={`${lpHeading} text-lp-h2-sm md:text-lp-h2`}>
                {closing.title}
              </h2>
              <p className="mx-auto mt-4 max-w-[32rem] text-lp-lg font-medium">{closing.text}</p>
              <Link to={primary.to} className={`${lpButton} mt-8 w-full sm:w-auto`}>
                {primary.label}
              </Link>
            </Reveal>
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
          <p className="mt-8 border-t-2 border-lp-ink pt-6 text-lp-sm font-medium">{footer.credit(new Date().getFullYear())}</p>
        </Container>
      </footer>
    </div>
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

  // Kaydırınca çubuk incelir ve gölgesi belirir.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
      <div className={`${lpBox} mx-auto max-w-lp bg-lp-paper transition-shadow duration-300 ${scrolled || menuOpen ? 'shadow-lp-sm' : 'shadow-none'}`}>
        <div className={`flex items-center justify-between gap-4 px-4 transition-[height] duration-300 md:px-6 ${scrolled ? 'h-14 md:h-16' : 'h-16 md:h-[76px]'}`}>
          <Link to="/" className={lpFocus} aria-label="StudyLounge ana sayfa">
            <LandingLockup />
          </Link>

          <nav aria-label="Sayfa içi" className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className={`${lpFocus} text-lp-base font-bold underline-offset-4 hover:underline`}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <Link to="/auth" className={`${lpFocus} hidden min-h-11 items-center px-2 text-lp-base font-bold underline-offset-4 hover:underline md:inline-flex`}>
                Giriş yap
              </Link>
            ) : null}
            <Link to={primary.to} className={`hidden min-h-10 sm:inline-flex ${lpButtonSm}`}>
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
        </div>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <motion.div
              id="mobil-menu"
              key="mobil-menu"
              className="overflow-hidden border-t-2 border-lp-ink lg:hidden"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="px-4 py-5">
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
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}

function WideBenefit({ benefit, from }: { benefit: Benefit; from: 'left' | 'right' }) {
  return (
    <Reveal as="article" from={from} className={`${lpBox} ${benefit.figure ? benefitSurfaces[benefit.figure] : ''} grid items-center gap-8 p-6 shadow-lp-md sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:col-span-2 lg:p-10`}>
      <div>
        <h3 className={lpH3}>{benefit.title}</h3>
        <p className="mt-4 text-lp-base font-medium md:text-lp-lg">{benefit.text}</p>
        {benefit.detail ? <p className="mt-3 text-lp-sm font-medium">{benefit.detail}</p> : null}
      </div>
      {benefit.figure ? figures[benefit.figure] : null}
    </Reveal>
  );
}

function NarrowBenefit({ benefit, from }: { benefit: Benefit; from: 'left' | 'right' }) {
  return (
    <Reveal as="article" from={from} delay={0.1} className={`${lpBox} flex flex-col bg-lp-card p-6 shadow-lp-md sm:p-8 lg:p-10`}>
      <h3 className={lpH3}>{benefit.title}</h3>
      <p className="mt-4 text-lp-base font-medium text-lp-muted md:text-lp-lg">{benefit.text}</p>
    </Reveal>
  );
}

function PriceCard({
  delay = 0,
  surface,
  name,
  description,
  price,
  period,
  note,
  features,
  action,
}: {
  delay?: number;
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
    <Reveal as="article" delay={delay} className={`${lpBox} ${surface} flex flex-col p-6 shadow-lp-md sm:p-8`}>
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
    </Reveal>
  );
}
