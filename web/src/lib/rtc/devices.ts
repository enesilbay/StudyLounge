/** Kamera ve mikrofon seçimi; tercih tarayıcıda hatırlanır. */
export type DeviceKind = 'camera' | 'mic';

export interface DevicePrefs {
  camera: string | null;
  mic: string | null;
}

const STORAGE_KEY = 'sl-media-devices';

export function loadDevicePrefs(): DevicePrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<DevicePrefs>;
    return { camera: parsed.camera ?? null, mic: parsed.mic ?? null };
  } catch {
    return { camera: null, mic: null };
  }
}

export function saveDevicePref(kind: DeviceKind, deviceId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadDevicePrefs(), [kind]: deviceId }));
  } catch {
    // Gizli sekmede depolama kapalı olabilir; seçim yalnızca bu oturumda geçerli olur.
  }
}

/** Bağlı kamera ve mikrofonlar. İzin verilmeden önce adlar boş gelir. */
export async function listMediaDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return { cameras: [], mics: [] };
  const devices = await navigator.mediaDevices.enumerateDevices();
  const named = (device: MediaDeviceInfo, index: number, fallback: string) => ({ deviceId: device.deviceId, label: device.label || `${fallback} ${index + 1}` });
  return {
    cameras: devices.filter((device) => device.kind === 'videoinput').map((device, index) => named(device, index, 'Kamera')),
    mics: devices.filter((device) => device.kind === 'audioinput').map((device, index) => named(device, index, 'Mikrofon')),
  };
}

/** Kamera ve mikrofon için getUserMedia kısıtları; seçili cihaz yoksa varsayılan kullanılır. */
export function constraintsFor(kind: DeviceKind, deviceId: string | null): MediaStreamConstraints {
  const device = deviceId ? { deviceId: { exact: deviceId } } : {};
  return kind === 'camera'
    ? { video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 }, ...device } }
    : { audio: { echoCancellation: true, noiseSuppression: true, ...device } };
}
