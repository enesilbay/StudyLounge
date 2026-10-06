import { useEffect, useId, useRef, useState } from 'react';
import { constraintsFor, listMediaDevices, type DeviceKind, type DevicePrefs } from '../../lib/rtc/devices';
import { Button, ModalShell, Notice } from '../ui';
import { VideoView } from './MediaViews';

type DeviceOption = { deviceId: string; label: string };

/**
 * Kamera/mikrofon seçimi ve önizleme. Pencere açıkken seçili kameradan görüntü ve
 * mikrofondan ses seviyesi gösterilir; kapanınca önizleme akışı durdurulur.
 * Odaya kamerayı açmadan önce görüntünü kontrol edebilirsin.
 */
export default function DeviceSettingsModal({
  open,
  devices,
  onChange,
  onClose,
}: {
  open: boolean;
  devices: DevicePrefs;
  onChange: (kind: DeviceKind, deviceId: string | null) => void;
  onClose: () => void;
}) {
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cameraId = useId();
  const micId = useId();

  // Önizleme: seçim değiştikçe yeniden açılır.
  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        const video = constraintsFor('camera', devices.camera).video;
        const audio = constraintsFor('mic', devices.mic).audio;
        stream = await navigator.mediaDevices.getUserMedia({ video, audio });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setError(null);
        setPreview(stream);
        // İzin verildikten sonra cihaz adları da gelir.
        const listed = await listMediaDevices();
        setCameras(listed.cameras);
        setMics(listed.mics);
      } catch (err) {
        if (cancelled) return;
        setPreview(null);
        setError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Tarayıcı kamera/mikrofon iznini engelledi. Adres çubuğundaki izin simgesinden izin ver.' : 'Seçili cihaz açılamadı. Başka bir cihaz seç.');
        const listed = await listMediaDevices().catch(() => ({ cameras: [], mics: [] }));
        setCameras(listed.cameras);
        setMics(listed.mics);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      setPreview(null);
    };
  }, [open, devices.camera, devices.mic]);

  // Mikrofon seviyesi (0-1)
  const frame = useRef<number | null>(null);
  useEffect(() => {
    const track = preview?.getAudioTracks()[0];
    if (!track) return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const value of data) peak = Math.max(peak, Math.abs(value - 128));
      setLevel(Math.min(1, peak / 64));
      frame.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      void context.close();
    };
  }, [preview]);

  // Mikrofon yoksa çubuk boş görünür (son ölçüm değeri kullanılmaz).
  const shownLevel = preview?.getAudioTracks().length ? level : 0;
  const selectCls = 'min-h-11 w-full rounded-lg border border-border bg-sunken px-3 text-base text-textDark outline-none focus:border-accent';

  return (
    <ModalShell open={open} title="Kamera ve mikrofon" description="Seçimin bu tarayıcıda hatırlanır. Kameran açıksa yeni cihaza görüşme kesilmeden geçilir." onClose={onClose}>
      <div className="space-y-4">
        <div className="aspect-video overflow-hidden rounded-lg bg-stage">
          {preview?.getVideoTracks().length ? (
            <VideoView stream={preview} mirror label="Kamera önizlemesi" />
          ) : (
            <p className="grid h-full place-items-center px-6 text-center text-[15px] text-white/75">{error ? 'Önizleme yok' : 'Kamera açılıyor…'}</p>
          )}
        </div>

        {error ? <Notice tone="danger">{error}</Notice> : null}

        <div>
          <label htmlFor={cameraId} className="mb-1.5 block text-sm font-semibold text-textDark">Kamera</label>
          <select id={cameraId} value={devices.camera ?? ''} onChange={(event) => onChange('camera', event.target.value || null)} className={selectCls}>
            <option value="">Tarayıcının varsayılanı</option>
            {cameras.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={micId} className="mb-1.5 block text-sm font-semibold text-textDark">Mikrofon</label>
          <select id={micId} value={devices.mic ?? ''} onChange={(event) => onChange('mic', event.target.value || null)} className={selectCls}>
            <option value="">Tarayıcının varsayılanı</option>
            {mics.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-2" aria-hidden="true">
            <span className="text-xs text-textMuted">Ses</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
              <span className="block h-2 rounded-full bg-primary transition-[width] duration-75" style={{ width: `${Math.round(shownLevel * 100)}%` }} />
            </span>
          </div>
          <p className="mt-1 text-xs text-textMuted">Konuşunca çubuk hareket etmiyorsa başka bir mikrofon seç.</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Tamam</Button>
        </div>
      </div>
    </ModalShell>
  );
}
