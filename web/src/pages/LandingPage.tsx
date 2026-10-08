import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { RoomPlan } from '../components/landing/RoomPlan';
import { BoardFigure, CameraFigure, ChatFigure, PhoneOnDesk, TimerRhythm } from '../components/landing/Figures';
import { useAuthStore } from '../store/authStore';

const steps = [
  {
    title: 'Bir odaya gir',
    text: 'Konusuna göre açılmış odalardan birine katıl ya da arkadaşının kurduğu şifreli odaya gir. Odada kimin çalıştığını, kimin molada olduğunu hemen görürsün.',
  },
  {
    title: 'Odaklan, lamban yansın',
    text: 'Telefonda uygulamayı açıp telefonu masaya bırakman yeterli: telefon masada durdukça süren işler, eline aldığında mola sayılır. Bilgisayarda "Odaklan"a basarsın; sekmeden uzun süre ayrılırsan odak durur.',
  },
  {
    title: 'Birlikte mola ver',
    text: 'Odadan biri ortak sayacı başlattığında katılan herkes aynı anda odaklanır, aynı anda mola verir. Mola bitince kısa bir zil çalar ve herkes masasına döner.',
  },
];

const features: Array<{ title: string; text: string; detail: string; figure: ReactNode }> = [
  {
    title: 'Ortak sayaç',
    text: 'Odak ve mola sırayla gelir; katılan herkesin sayacı aynıdır. Duraklatan ya da bitiren kim olursa olsun odadaki herkes görür.',
    detail: 'Kendi kişisel sayacınla da çalışabilirsin; ortak sayaca katılmak isteğe bağlı.',
    figure: <TimerRhythm />,
  },
  {
    title: 'Ortak tahta',
    text: 'Ders notunu PDF olarak yükle, odadaki herkes aynı sayfayı görsün. Kalemle çiz, fosforlu kalemle işaretle, lazerle bir yeri göster. İstersen boş bir tahta açıp soru çözün.',
    detail: 'Tablet kalemiyle çizerken bastırdıkça çizgi kalınlaşır, avuç içi dokunuşu çizim yapmaz.',
    figure: <BoardFigure />,
  },
  {
    title: 'Sohbet ve dürtme',
    text: 'Odaya mesaj yaz, fotoğraf ya da dosya paylaş. Masasından kalkıp uzun süre dönmeyen arkadaşını dürt; telefonuna bildirim gider.',
    detail: 'Arkadaşlarınla ayrıca birebir mesajlaşabilir, birlikte çalışmak için ileri tarihli oturum planlayabilirsin.',
    figure: <ChatFigure />,
  },
  {
    title: 'İstersen kamera',
    text: 'Kameralı odalarda en fazla altı kişi görüntülü çalışır, takıldığı soruyu ekranını paylaşarak gösterir. Kamera ve mikrofon sen açana kadar kapalı kalır.',
    detail: 'Görüntü ve ses tarayıcılar arasında şifreli olarak akar ve kaydedilmez. Normal odalarda kamera hiç açılmaz.',
    figure: <CameraFigure />,
  },
];

const audiences = [
  {
    title: 'Vize ve final haftasındaki üniversite öğrencileri',
    text: 'Kütüphanede yer bulamadığın, evde dağıldığın günlerde bölümden arkadaşlarınla aynı odada çalış.',
    points: ['Ders notlarını tahtaya açıp takıldığınız soruya birlikte bakın.', 'Ortak sayaçla aynı anda mola verin, sohbeti molaya bırakın.', 'Şifreli odalarda yalnızca şifreyi bilenler olur.'],
  },
  {
    title: 'Uzun bir sınava hazırlananlar',
    text: 'YKS, KPSS, ALES gibi aylara yayılan bir hazırlıkta her gün aynı saatte masaya oturmak için.',
    points: ['Derslerine göre ne kadar çalıştığını gör.', 'Günlük ve haftalık hedef koy, serini bozma.', 'Haftalık ligde arkadaşlarınla ya da herkesle yarış.'],
  },
];

const progress = [
  { term: 'Dersler ve oturum geçmişi', text: 'Her oturum hangi derse ait olduğuyla kaydedilir; hangi derse ne kadar zaman ayırdığını görürsün.' },
  { term: 'Hedefler', text: 'Günlük ve haftalık dakika hedefi koyarsın, hedefi tutturduğun gün bonus puan kazanırsın.' },
  { term: 'Seri ve rozetler', text: 'Üst üste çalıştığın günler seriyi büyütür; belli eşiklerde rozet kazanırsın.' },
  { term: 'Haftalık lig', text: 'Sıralama her pazartesi sıfırlanır; ilk üçe giren puan ödülü alır.' },
  { term: 'Odak puanı ve mağaza', text: 'Odaklandıkça puan biriktirir, sohbet balonu rengi, isim ikonu ya da profil çerçevesi alırsın.' },
  { term: 'Telefon ve bilgisayar', text: 'Aynı hesap ikisinde de çalışır; süren, serin ve puanın ikisinde de aynıdır.' },
];

const faqs = [
  {
    q: 'Ücretsiz mi?',
    a: 'Evet. Hesap açmak, odalara katılmak, ortak sayaç, ortak tahta, sohbet, istatistikler, hedefler ve haftalık lig ücretsizdir.',
  },
  {
    q: 'Premium neler ekliyor?',
    a: 'Kendi odanı kurabilir, kameralı oda açabilir ve sadece Premium üyelerin girdiği, odak süresinin iki kat sayıldığı Elite odalara girebilirsin. Ortam seslerini de odadakilerle eşleyebilirsin.',
  },
  {
    q: 'Kamera açmam gerekiyor mu?',
    a: 'Hayır. Kamera yalnızca kameralı odalarda ve sen açarsan çalışır. Normal odalarda odak, telefonun masada durmasıyla ya da tarayıcı sekmesinin açık kalmasıyla ölçülür.',
  },
  {
    q: 'Telefonum yanımda değilse?',
    a: 'Bilgisayardan da çalışabilirsin. Odağı "Odaklan" düğmesi başlatır; sekmeden bir dakikadan uzun ayrılırsan odak duraklatılır.',
  },
  {
    q: 'Bir odada kaç kişi olabilir?',
    a: 'Kameralı odalar en fazla altı kişiliktir. Diğer odaların kapasitesini odayı kuran kişi belirler.',
  },
  {
    q: 'Arkadaşlarımla nasıl aynı odaya girerim?',
    a: 'Arkadaşını kullanıcı adıyla ekle, sonra aynı odaya katılın. Yalnızca sizin olacak bir oda istiyorsanız şifreli oda kurulabilir.',
  },
];

export default function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const primary = isAuthenticated ? { to: '/app/lobbies', label: 'Odalara git' } : { to: '/auth?mod=kayit', label: 'Ücretsiz hesap aç' };

  return (
    <div className="min-h-screen bg-lp-paper font-sans text-lp-ink">
      {/* ── Gece: başlık ve örnek oda ── */}
      <div className="bg-lp-night text-lp-on-night">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5 rounded-md">
            <LandingMark className="h-8 w-8" />
            <span className="font-lp-display text-xl font-semibold tracking-tight">StudyLounge</span>
          </Link>
          <nav aria-label="Sayfa içi" className="hidden items-center gap-1 md:flex">
            <NavAnchor href="#nasil">Nasıl çalışır</NavAnchor>
            <NavAnchor href="#oda">Odada neler var</NavAnchor>
            <NavAnchor href="#sss">Sorular</NavAnchor>
          </nav>
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <Link to="/auth" className="hidden min-h-10 items-center rounded-lg px-3 text-[15px] font-semibold text-lp-on-night hover:bg-white/5 sm:inline-flex">
                Giriş yap
              </Link>
            ) : null}
            <Link to={primary.to} className="inline-flex min-h-10 items-center rounded-lg bg-lp-lamp px-4 text-[15px] font-semibold text-lp-night transition hover:brightness-105">
              {primary.label}
            </Link>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-8 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:pb-28 lg:pt-14">
          <div className="max-w-xl">
            <h1 className="font-lp-display text-[clamp(2.75rem,6.2vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              Ayrı masalarda, aynı lobide.
            </h1>
            <p className="mt-6 text-lg leading-8 text-lp-on-night-muted">
              StudyLounge, tek başına çalışan öğrencileri aynı sanal çalışma odasında buluşturur. Odaklanan herkesin lambası yanar;
              ortak sayaç odadaki herkes için aynı anda işler, mola da birlikte gelir.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to={primary.to} className="inline-flex min-h-12 items-center rounded-lg bg-lp-lamp px-6 text-base font-semibold text-lp-night transition hover:brightness-105">
                {primary.label}
              </Link>
              <a href="#nasil" className="inline-flex min-h-12 items-center rounded-lg px-5 text-base font-semibold text-lp-on-night ring-1 ring-lp-on-night/25 transition hover:bg-white/5">
                Nasıl çalıştığını gör
              </a>
            </div>
            <p className="mt-5 text-[15px] text-lp-on-night-muted">Kamera açman gerekmez. Telefonda ve bilgisayarda aynı hesapla çalışır.</p>
          </div>
          <RoomPlan />
        </section>
      </div>

      <main>
        {/* ── Nasıl çalışır: gerçek bir sıra, numaralar bu yüzden var ── */}
        <section id="nasil" className="scroll-mt-6 mx-auto w-full max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <h2 className="max-w-2xl font-lp-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">Üç adımda çalışma odası</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-lp-graphite">Kurulum yok, takvim ayarlamak yok. Odaya girersin, odaklanırsın; gerisi herkes için aynı anda işler.</p>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-4">
                  <span className="font-lp-display text-5xl font-semibold leading-none tracking-tight text-lp-lamp-ink">{index + 1}</span>
                  {index < steps.length - 1 ? <span aria-hidden="true" className="hidden h-px flex-1 bg-lp-line md:block" /> : null}
                </div>
                <h3 className="mt-5 font-lp-display text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-[17px] leading-7 text-lp-graphite">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Odada neler var ── */}
        <section id="oda" className="scroll-mt-6 border-t border-lp-line bg-white">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 lg:py-28">
            <h2 className="max-w-2xl font-lp-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">Odada neler var</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-lp-graphite">Bir çalışma odası, birlikte çalışmayı kolaylaştıran dört şeyle gelir. Hepsi odaya girdiğin anda hazır.</p>
            <div className="mt-16 space-y-20 lg:space-y-28">
              {features.map((feature, index) => (
                <article key={feature.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                  <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                    <h3 className="font-lp-display text-[clamp(1.6rem,2.4vw,2.1rem)] font-semibold tracking-[-0.02em]">{feature.title}</h3>
                    <p className="mt-4 max-w-lg text-[17px] leading-7 text-lp-ink">{feature.text}</p>
                    <p className="mt-3 max-w-lg text-[15px] leading-6 text-lp-graphite">{feature.detail}</p>
                  </div>
                  <div className={`flex ${index % 2 === 1 ? 'lg:order-1' : ''}`}>{feature.figure}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Kimin için ── */}
        <section id="kimin" className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <h2 className="max-w-2xl font-lp-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">Kimler için</h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
            {audiences.map((audience) => (
              <div key={audience.title} className="border-l-2 border-lp-lamp pl-6">
                <h3 className="font-lp-display text-2xl font-semibold leading-tight tracking-tight">{audience.title}</h3>
                <p className="mt-3 text-[17px] leading-7 text-lp-graphite">{audience.text}</p>
                <ul className="mt-5 space-y-2.5 text-[16px] leading-6 text-lp-ink">
                  {audience.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lp-ink" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Gizlilik: gece bandı ── */}
        <section className="bg-lp-night text-lp-on-night">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div>
              <h2 className="font-lp-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">Kameraya değil, masaya bakar</h2>
              <p className="mt-5 max-w-lg text-lg leading-8 text-lp-on-night-muted">
                Telefon uygulaması, telefonun masada durup durmadığını ivmeölçerle anlar. Görüntü yok, ses yok. Odadakiler yalnızca senin lambanın yanıp
                yanmadığını görür.
              </p>
              <ul className="mt-8 space-y-4 text-[17px] leading-7">
                <li>Kamera hiçbir odada zorunlu değil.</li>
                <li>Kameralı odalarda görüntü ve ses kaydedilmez.</li>
                <li>Ekran paylaşımını istediğin an durdurursun.</li>
              </ul>
            </div>
            <PhoneOnDesk />
          </div>
        </section>

        {/* ── İlerleme ── */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <h2 className="max-w-2xl font-lp-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">Çalıştığın her dakika kayda geçer</h2>
          <dl className="mt-12 grid gap-x-16 gap-y-9 md:grid-cols-2">
            {progress.map((item) => (
              <div key={item.term}>
                <dt className="font-lp-display text-xl font-semibold tracking-tight">{item.term}</dt>
                <dd className="mt-1.5 text-[16px] leading-7 text-lp-graphite">{item.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Sorular ── */}
        <section id="sss" className="scroll-mt-6 border-t border-lp-line bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-28">
            <h2 className="font-lp-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">Sık sorulanlar</h2>
            <div className="divide-y divide-lp-line border-y border-lp-line">
              {faqs.map((faq) => (
                <details key={faq.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-lp-display text-xl font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-lp-graphite transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="max-w-2xl pb-6 text-[17px] leading-7 text-lp-graphite">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Son çağrı ── */}
        <section className="relative overflow-hidden bg-lp-night text-lp-on-night">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[140%] w-[70%] -translate-x-1/2 -translate-y-1/3"
            style={{ background: 'radial-gradient(closest-side, rgb(255 157 187 / 0.22), transparent 75%)' }}
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-5 py-20 md:flex-row md:items-end md:justify-between md:px-8 lg:py-24">
            <div>
              <h2 className="font-lp-display text-[clamp(2.25rem,4.4vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">Bu akşam bir masa boş.</h2>
              <p className="mt-4 text-lg text-lp-on-night-muted">Hesap açmak bir dakika sürer. E-postanı doğrularsın, ilk odana girersin.</p>
            </div>
            <Link to={primary.to} className="inline-flex min-h-12 shrink-0 items-center rounded-lg bg-lp-lamp px-6 text-base font-semibold text-lp-night transition hover:brightness-105">
              {primary.label}
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-lp-night text-lp-on-night-muted">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-white/10 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span className="flex items-center gap-2 text-lp-on-night">
            <LandingMark className="h-6 w-6" />
            <span className="font-lp-display font-semibold">StudyLounge</span>
          </span>
          <p>Enes İlbay tarafından mezuniyet projesi olarak geliştirildi, {new Date().getFullYear()}.</p>
        </div>
      </footer>
    </div>
  );
}

function NavAnchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="rounded-md px-3 py-2 text-[15px] font-semibold text-lp-on-night-muted transition hover:text-lp-on-night">
      {children}
    </a>
  );
}

/** Masa lambası işareti; açılış sayfasının sabit renkleriyle. */
function LandingMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <ellipse cx="16" cy="18" rx="12" ry="5.5" fill="var(--color-lp-lamp)" opacity="0.28" />
      <path d="M5 14.5C5 10.4 10 7.5 16 7.5s11 2.9 11 7H5Z" fill="var(--color-lp-sea)" />
      <path d="M7 14.5h18l-1.8 2.6H8.8L7 14.5Z" fill="var(--color-lp-lamp)" />
      <rect x="15" y="17" width="2" height="7.5" fill="var(--color-lp-on-night)" />
      <rect x="10" y="24" width="12" height="2.4" rx="1.2" fill="var(--color-lp-on-night)" />
    </svg>
  );
}
