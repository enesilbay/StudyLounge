import { Eraser, Highlighter, MicOff, MonitorUp, PenLine, WandSparkles } from 'lucide-react';

/*
 * Açılış sayfasındaki özellik çizimleri. Gerçek arayüzün sadeleştirilmiş
 * hâlleri; ekran görüntüsü değil, her biri tek bir fikri anlatır.
 */

/** Ortak sayacın ritmi: odak ve mola sırayla, odadaki herkes için aynı anda. */
export function TimerRhythm() {
  const rounds = [1, 2, 3];
  return (
    <div className="w-full">
      <div className="flex h-14 w-full gap-1.5" aria-hidden="true">
        {rounds.map((round) => (
          <div key={round} className="flex flex-[30] gap-1.5">
            <div className={`relative flex-[25] rounded-lg ${round <= 2 ? 'bg-lp-lamp' : 'bg-lp-lamp/35'}`}>
              {round === 2 ? <span className="absolute -top-2 bottom-[-8px] left-[64%] w-0.5 rounded-full bg-lp-ink" /> : null}
            </div>
            <div className="flex-[5] rounded-lg border border-lp-line bg-lp-paper-2" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-lp-graphite">
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-lp-lamp" /> 25 dk odak
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded border border-lp-line bg-lp-paper-2" /> 5 dk mola
        </span>
        <span className="flex items-center gap-2">
          <span className="h-4 w-0.5 rounded-full bg-lp-ink" /> Şu an: 2. tur, 9 dk kaldı
        </span>
      </div>
    </div>
  );
}

/** Ortak tahta: PDF sayfası, birkaç kişinin işaretleri ve araç çubuğu. */
export function BoardFigure() {
  const tools = [
    { icon: PenLine, label: 'Kalem', active: true },
    { icon: Highlighter, label: 'Fosforlu kalem', active: false },
    { icon: WandSparkles, label: 'Lazer', active: false },
    { icon: Eraser, label: 'Silgi', active: false },
  ];
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-lp-line bg-white">
      <div className="flex items-center gap-1 border-b border-lp-line px-3 py-2" aria-hidden="true">
        {tools.map((tool) => (
          <span key={tool.label} className={`grid h-8 w-8 place-items-center rounded-md ${tool.active ? 'bg-lp-night text-lp-on-night' : 'text-lp-graphite'}`}>
            <tool.icon className="h-4 w-4" />
          </span>
        ))}
        <span className="ml-auto text-sm text-lp-graphite">3 / 12</span>
      </div>
      <div className="relative px-6 py-5">
        <p className="font-lp-display text-lg font-semibold text-lp-ink">Newton'un ikinci yasası</p>
        <p className="mt-1 font-lp-display text-2xl font-semibold tracking-tight text-lp-ink">F = m · a</p>
        <div className="mt-4 space-y-2.5" aria-hidden="true">
          {[94, 82, 90, 70, 86].map((width, line) => (
            <div key={line} className="h-1.5 rounded-full bg-lp-line" style={{ width: `${width}%` }} />
          ))}
        </div>
        <svg viewBox="0 0 300 160" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M22 72 L120 72" stroke="var(--color-lp-lamp)" strokeOpacity="0.55" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M200 40 C 230 30, 280 40, 276 66 C 272 88, 214 90, 204 70 C 198 56, 206 46, 214 42" stroke="var(--color-lp-sea)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
        <span className="absolute right-6 top-24 rounded-full bg-lp-sea px-2 py-0.5 text-xs font-semibold text-lp-night">Zeynep</span>
        <span className="absolute left-32 top-[4.6rem] rounded-full bg-lp-lamp px-2 py-0.5 text-xs font-semibold text-lp-night">Mert</span>
      </div>
    </div>
  );
}

/** Oda sohbeti ve dürtme. */
export function ChatFigure() {
  return (
    <div className="w-full space-y-3" aria-hidden="true">
      <div className="max-w-[80%]">
        <p className="mb-1 text-sm font-semibold text-lp-graphite">Mert</p>
        <p className="rounded-2xl rounded-tl-md bg-lp-paper-2 px-4 py-2.5 text-[15px] text-lp-ink">3. soruyu çözen var mı? Sonuç bende negatif çıkıyor.</p>
      </div>
      <div className="ml-auto max-w-[80%]">
        <p className="rounded-2xl rounded-tr-md bg-lp-night px-4 py-2.5 text-[15px] text-lp-on-night">Notlarımı tahtaya açtım, işaret hatası var gibi.</p>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-lp-lamp/60 bg-white px-4 py-3 text-[15px] text-lp-ink">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-lp-lamp" />
        Can seni masaya çağırıyor.
      </div>
    </div>
  );
}

/** Kameralı oda: en fazla 6 kişi, kamera ve ekran paylaşımı isteğe bağlı. */
export function CameraFigure() {
  const tiles = [
    { name: 'Zeynep', camera: true },
    { name: 'Mert', screen: true },
    { name: 'Elif', camera: true, muted: true },
    { name: 'Can' },
    { name: 'Deniz', camera: true },
    { name: 'Selin' },
  ];
  return (
    <div className="grid w-full grid-cols-3 gap-2" aria-hidden="true">
      {tiles.map((tile) => (
        <div key={tile.name} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-lp-night-2">
          {tile.camera ? (
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
              <span className="h-[34%] min-h-5 w-[26%] rounded-full bg-lp-on-night-muted/45" style={{ aspectRatio: '1' }} />
              <span className="mt-1 h-7 w-[58%] rounded-t-full bg-lp-on-night-muted/35" />
            </div>
          ) : tile.screen ? (
            <div className="absolute inset-[14%] rounded-md bg-lp-paper p-1.5">
              <div className="h-1 w-3/4 rounded bg-lp-line" />
              <div className="mt-1 h-1 w-1/2 rounded bg-lp-line" />
              <div className="mt-1 h-1 w-2/3 rounded bg-lp-line" />
            </div>
          ) : (
            <span className="absolute inset-0 m-auto grid h-9 w-9 place-items-center rounded-full bg-lp-on-night-muted/25 font-lp-display text-sm font-semibold text-lp-on-night">{tile.name.charAt(0)}</span>
          )}
          <span className="absolute bottom-1.5 left-2 flex items-center gap-1 text-[11px] font-semibold text-lp-on-night">
            {tile.name}
            {tile.screen ? <MonitorUp className="h-3 w-3 text-lp-sea" /> : null}
            {tile.muted ? <MicOff className="h-3 w-3 opacity-70" /> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Masada ters duran telefon ve yanan lamba: kamera olmadan odak. */
export function PhoneOnDesk() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-md" aria-hidden="true">
      <div className="absolute inset-[6%] rounded-[28px] bg-lp-desk ring-1 ring-white/5" />
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(closest-side at 62% 42%, rgb(255 157 187 / 0.34), rgb(255 157 187 / 0.08) 60%, transparent 80%)' }}
      />
      {/* Lamba */}
      <span className="absolute right-[16%] top-[16%] h-[9%] w-[7.2%] rounded-full bg-lp-lamp shadow-[0_0_28px_8px_rgb(255_157_187/0.6)]" />
      {/* Defter */}
      <div className="absolute left-[14%] top-[22%] h-[44%] w-[38%] -rotate-6 rounded-md bg-lp-on-night/90 p-[4%]">
        {[80, 64, 72, 50, 68].map((width, line) => (
          <div key={line} className="mb-[9%] h-[3%] min-h-[2px] rounded-full bg-lp-line" style={{ width: `${width}%` }} />
        ))}
      </div>
      {/* Ekranı masaya dönük telefon */}
      <div className="absolute bottom-[16%] right-[22%] h-[40%] w-[20%] rotate-12 rounded-[14px] bg-lp-night ring-1 ring-lp-sea/25">
        <span className="absolute left-[14%] top-[6%] h-[16%] w-[36%] rounded-[6px] bg-lp-night-2 ring-1 ring-white/5" />
      </div>
    </div>
  );
}
