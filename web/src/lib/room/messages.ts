import type { Message } from '../types';

/** Sunucu kimlik göndermeyen canlı mesajlara verilen yerel (negatif) kimlikler; şikayet edilemez. */
let localIdCounter = 0;

/** Kimliği sunucudan gelmiş (gerçek) bir mesaj mı? */
export function hasServerId(message: Pick<Message, 'id'>) {
  return typeof message.id === 'number' && message.id > 0;
}

export function normalizeSocketMessage(message: Message, roomName: string): Message {
  return {
    ...message,
    id: message.id ?? -(Date.now() * 1000 + (++localIdCounter % 1000)),
    roomName,
    createdAt: message.createdAt ?? message.timestamp ?? new Date().toISOString(),
    user: message.user ?? (message.userId ? { id: message.userId, fullName: message.fullName ?? 'Öğrenci', email: '', username: '' } : undefined),
  };
}

/** Aynı mesajı gösteren iki kaydı eşleştirmek için anahtar (dosyalar bağlantısıyla tekilleşir). */
export function messageIdentity(message: Message) {
  if (message.fileUrl) return `file:${message.fileUrl}`;
  if (hasServerId(message)) return `id:${message.id}`;
  return `${message.user?.id ?? message.userId ?? 'anon'}:${message.text}:${message.createdAt ?? message.timestamp ?? ''}`;
}

const SAME_MESSAGE_WINDOW_MS = 15_000;

function senderOf(message: Message) {
  return message.user?.id ?? message.userId ?? null;
}

function timeOf(message: Message) {
  const value = Date.parse(message.createdAt ?? message.timestamp ?? '');
  return Number.isNaN(value) ? 0 : value;
}

/** Kimliksiz canlı mesaj, geçmişteki gerçek kaydın aynısı mı? (aynı kişi, metin ve yakın zaman) */
function isSameContent(local: Message, saved: Message) {
  return senderOf(local) === senderOf(saved) && local.text === saved.text && Math.abs(timeOf(local) - timeOf(saved)) <= SAME_MESSAGE_WINDOW_MS;
}

/** Yeni gelen mesajı listeye ekler; zaten varsa eklemez, kimliksiz kaydın yerine gerçek kimlikli olanı koyar. */
export function addMessage(current: Message[], incoming: Message): Message[] {
  const key = messageIdentity(incoming);
  const index = current.findIndex((item) => messageIdentity(item) === key);
  if (index === -1) return [...current, incoming];
  if (!hasServerId(current[index]) && hasServerId(incoming)) {
    const next = current.slice();
    next[index] = incoming;
    return next;
  }
  return current;
}

/**
 * Sunucudan çekilen geçmişi, o ana kadar canlı gelen mesajlarla birleştirir:
 * geçmiş esas alınır, geçmişte olmayan canlı mesajlar zamanına göre araya girer (canlı mesaj ezilmez).
 */
export function mergeMessages(history: Message[], live: Message[]): Message[] {
  const known = new Set(history.map(messageIdentity));
  const extra = live.filter((message) => {
    if (known.has(messageIdentity(message))) return false;
    if (!hasServerId(message) && history.some((saved) => isSameContent(message, saved))) return false;
    return true;
  });
  if (!extra.length) return history;
  return [...history, ...extra].sort((a, b) => timeOf(a) - timeOf(b));
}
