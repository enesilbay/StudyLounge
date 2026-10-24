import type { ReactNode } from 'react';
import { Eraser, Highlighter, MicOff, MonitorUp, PenLine, Video, WandSparkles } from 'lucide-react';
import { lpBox } from './styles';

/*
 * Açılış sayfasındaki özellik çizimleri. Gerçek arayüzün sadeleştirilmiş
 * hâlleri; ekran görüntüsü değil, her biri tek bir fikri anlatır. Kişiler
 * örnektir. Her çizim kalın çerçeveli beyaz bir "ekran parçası" içindedir.
 */

/** Çizimlerin ortak çerçevesi; içerik ekran okuyucuya tek bir görsel olarak, alt metniyle sunulur. */
function Screen({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="img" aria-label={label} className={`${lpBox} w-full bg-lp-card p-4 font-lp-sans tracking-lp text-lp-ink shadow-lp-sm md:p-5 ${className}`}>
      {children}
    </div>
  );
}

/** Ortak sayacın ritmi: odak ve mola sırayla, odadaki herkes için aynı anda. */
export function TimerRhythm() {
  const rounds = [1, 2, 3];
  return (
    <Screen label="Ortak sayacın ritmi: 25 dakika odak, 5 dakika mola, üç tur. Şu an ikinci turdayız, 9 dakika kaldı.">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lp-h3 font-black tabular-nums">09:00</span>
        <span className="text-lp-sm font-bold">2. tur · 9 dk kaldı</span>
      </div>
      <div className="mt-4 flex h-11 w-full gap-1.5">
        {rounds.map((round) => (
          <div key={round} className="flex flex-[30] gap-1.5">
            <div className={`relative flex-[25] border-2 border-lp-ink ${round <= 2 ? 'bg-lp-action' : 'bg-lp-card'}`}>
              {round === 2 ? <span className="absolute -bottom-2 -top-2 left-[64%] w-[3px] bg-lp-ink" /> : null}
            </div>
            <div className="flex-[5] border-2 border-lp-ink bg-lp-tint-green" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-lp-sm font-medium">
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 border-2 border-lp-ink bg-lp-action" /> 25 dk odak
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 border-2 border-lp-ink bg-lp-tint-green" /> 5 dk mola
        </span>
      </div>
    </Screen>
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
    <Screen label="Ortak PDF tahtası: Newton'un ikinci yasası sayfasında Mert fosforlu kalemle bir satırı işaretlemiş, Zeynep bir yeri yuvarlak içine almış." className="p-0!">
      <div className="flex items-center gap-1 border-b-2 border-lp-ink px-3 py-2">
        {tools.map((tool) => (
          <span key={tool.label} className={`grid h-8 w-8 place-items-center border-2 ${tool.active ? 'border-lp-ink bg-lp-ink text-lp-card' : 'border-transparent text-lp-ink'}`}>
            <tool.icon className="h-4 w-4" />
          </span>
        ))}
        <span className="ml-auto text-lp-sm font-bold">3 / 12</span>
      </div>
      <div className="relative px-5 py-4">
        <p className="text-lp-base font-bold">Newton'un ikinci yasası</p>
        <p className="mt-1 text-lp-h3 font-black">F = m · a</p>
        <div className="mt-3 space-y-2.5">
          {[94, 82, 90, 70, 86].map((width, line) => (
            <div key={line} className="h-1.5 bg-lp-line" style={{ width: `${width}%` }} />
          ))}
        </div>
        <svg viewBox="0 0 300 160" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path d="M20 72 L130 72" stroke="var(--color-lp-action)" strokeOpacity="0.8" strokeWidth="14" fill="none" />
          <path d="M196 40 C 226 30, 280 40, 276 66 C 272 88, 214 90, 204 70 C 198 56, 206 46, 214 42" stroke="var(--color-lp-ink)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
        <span className="absolute right-5 top-[5.5rem] border-2 border-lp-ink bg-lp-tint-green px-1.5 py-0.5 text-[0.75rem] font-bold">Zeynep</span>
        <span className="absolute left-[8.5rem] top-[4.4rem] border-2 border-lp-ink bg-lp-tint-warm px-1.5 py-0.5 text-[0.75rem] font-bold">Mert</span>
      </div>
    </Screen>
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
    <Screen label="Altı kişilik kameralı oda: üç kişinin kamerası açık, Mert ekranını paylaşıyor, iki kişinin kamerası kapalı.">
      <div className="mb-3 flex items-center gap-2 text-lp-sm font-bold">
        <Video className="h-4 w-4" aria-hidden="true" /> Kameralı oda · 6 / 6
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.name} className={`relative aspect-[4/3] overflow-hidden border-2 border-lp-ink ${tile.camera ? 'bg-lp-tint-green' : tile.screen ? 'bg-lp-tint-warm' : 'bg-lp-paper'}`}>
            {tile.camera ? (
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                <span className="aspect-square w-[26%] rounded-full border-2 border-lp-ink bg-lp-card" />
                <span className="-mt-px h-5 w-[56%] rounded-t-full border-2 border-b-0 border-lp-ink bg-lp-card md:h-7" />
              </div>
            ) : tile.screen ? (
              <div className="absolute inset-x-[14%] top-[14%] bottom-[30%] border-2 border-lp-ink bg-lp-card p-1">
                <div className="h-1 w-3/4 bg-lp-line" />
                <div className="mt-1 h-1 w-1/2 bg-lp-line" />
              </div>
            ) : (
              <span className="absolute inset-0 m-auto grid h-8 w-8 place-items-center rounded-full border-2 border-lp-ink bg-lp-card text-lp-sm font-black">{tile.name.charAt(0)}</span>
            )}
            <span className="absolute left-1 top-1 flex items-center gap-1 bg-lp-card px-1 text-[0.6875rem] font-bold leading-4">
              {tile.name}
              {tile.screen ? <MonitorUp className="h-3 w-3" /> : null}
              {tile.muted ? <MicOff className="h-3 w-3" /> : null}
            </span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

/** 1. adım: odalar listesi. */
export function RoomListFigure() {
  const rooms = [
    { name: 'Sessiz kütüphane', meta: '5 kişi · 4 odakta', lit: 4 },
    { name: 'YKS sayısal', meta: '9 kişi · 7 odakta', lit: 7 },
    { name: 'Fizik 101 çalışma', meta: 'Kameralı · 3 / 6', lit: 2, camera: true },
  ];
  return (
    <Screen label="Odalar listesi: Sessiz kütüphane, YKS sayısal ve kameralı Fizik 101 çalışma odası; her odada kaç kişinin odaklandığı görünüyor.">
      <p className="text-lp-h4 font-black uppercase">Odalar</p>
      <ul className="mt-3 space-y-2.5">
        {rooms.map((room) => (
          <li key={room.name} className="flex items-center gap-3 border-2 border-lp-ink bg-lp-paper px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate text-lp-base font-bold">
                {room.camera ? <Video className="h-4 w-4 shrink-0" /> : null}
                {room.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-lp-sm font-medium text-lp-muted">
                <span className="flex gap-0.5">
                  {Array.from({ length: Math.min(room.lit, 5) }, (_, index) => (
                    <span key={index} className="h-2 w-2 rounded-full border border-lp-ink bg-lp-action" />
                  ))}
                </span>
                {room.meta}
              </span>
            </span>
            <span className="shrink-0 border-2 border-lp-ink bg-lp-card px-2.5 py-1 text-lp-sm font-bold">Katıl</span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

/** 3. adım: ortak mola. Sayaç herkes için aynı anda molaya geçer, sohbet molaya kalır. */
export function BreakFigure() {
  return (
    <Screen label="Ortak sayaç molada, 4 dakika 12 saniye kaldı. Mert üçüncü soruyu soruyor, cevap olarak notların tahtaya açıldığı yazılıyor. Mola bitince zil çalacak.">
      <div className="flex items-center justify-between gap-3 border-2 border-lp-ink bg-lp-tint-green px-3 py-2">
        <span className="text-lp-h4 font-black uppercase">Mola</span>
        <span className="text-lp-h4 font-black tabular-nums">04:12</span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="max-w-[85%]">
          <p className="mb-1 text-lp-sm font-bold">Mert</p>
          <p className="border-2 border-lp-ink bg-lp-paper px-3 py-2 text-lp-sm font-medium md:text-lp-base">3. soruyu çözen var mı? Sonuç bende negatif çıkıyor.</p>
        </div>
        <div className="ml-auto max-w-[85%]">
          <p className="border-2 border-lp-ink bg-lp-tint-warm px-3 py-2 text-lp-sm font-medium md:text-lp-base">Notlarımı tahtaya açtım, işaret hatası var gibi.</p>
        </div>
        <p className="text-lp-sm font-medium text-lp-muted">Mola bitince zil çalar, herkes masasına döner.</p>
      </div>
    </Screen>
  );
}
