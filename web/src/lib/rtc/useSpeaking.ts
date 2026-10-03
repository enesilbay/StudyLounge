import { useEffect, useMemo, useState } from 'react';

/** Konuşma sayılan ses seviyesi (RMS, 0..1). Klavye ve fan sesini eler. */
const SPEAKING_LEVEL = 0.035;
/** Konuşma bittikten sonra halkanın sönmesi için beklenen süre; kelime aralarında yanıp sönmesin. */
const RELEASE_MS = 450;
const SAMPLE_MS = 90;

export interface SpeakingSource {
  id: number;
  stream: MediaStream | null;
  /** Mikrofon kapalıysa hiç dinlenmez. */
  enabled: boolean;
}

let sharedContext: AudioContext | null = null;

/** Tarayıcı ses bağlamını ilk kullanıcı etkileşiminden sonra başlatır (autoplay kuralı). */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!sharedContext) {
    sharedContext = new AudioContext();
    const resume = () => void sharedContext?.resume();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }
  return sharedContext;
}

/**
 * Hangi katılımcıların şu an konuştuğunu döndürür (Discord'daki yeşil halka gibi).
 * Her ses akışına bir AnalyserNode bağlanır; ses hoparlöre gitmez, yalnızca ölçülür.
 */
export function useSpeaking(sources: SpeakingSource[]): Set<number> {
  const [speaking, setSpeaking] = useState<Set<number>>(() => new Set());

  // Yalnızca dinlenecek ses izleri değişince analizörler yeniden kurulur.
  const active = sources.filter((source) => source.enabled && source.stream?.getAudioTracks().some((track) => track.readyState === 'live'));
  const signature = active.map((source) => `${source.id}:${source.stream!.getAudioTracks().map((track) => track.id).join(',')}`).join('|');
  const activeRef = useMemo(() => active, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const context = getAudioContext();
    if (!context || !activeRef.length) return;

    const meters = activeRef.map((source) => {
      const node = context.createMediaStreamSource(new MediaStream(source.stream!.getAudioTracks()));
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      node.connect(analyser);
      return { id: source.id, node, analyser, buffer: new Float32Array(analyser.fftSize), lastLoudAt: 0 };
    });

    const timer = window.setInterval(() => {
      const now = performance.now();
      const next = new Set<number>();
      for (const meter of meters) {
        meter.analyser.getFloatTimeDomainData(meter.buffer);
        let sum = 0;
        for (const sample of meter.buffer) sum += sample * sample;
        if (Math.sqrt(sum / meter.buffer.length) > SPEAKING_LEVEL) meter.lastLoudAt = now;
        if (now - meter.lastLoudAt < RELEASE_MS) next.add(meter.id);
      }
      setSpeaking((current) => (sameSet(current, next) ? current : next));
    }, SAMPLE_MS);

    return () => {
      window.clearInterval(timer);
      meters.forEach((meter) => meter.node.disconnect());
    };
  }, [activeRef]);

  // Mikrofonu kapanan ya da ayrılan kişinin halkası eski ölçümden kalmasın.
  return useMemo(() => {
    const ids = new Set(activeRef.map((source) => source.id));
    const visible = new Set([...speaking].filter((id) => ids.has(id)));
    return visible.size === speaking.size ? speaking : visible;
  }, [speaking, activeRef]);
}

function sameSet(a: Set<number>, b: Set<number>) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}
