import { api } from './api';
import { unwrapData } from './apiResponses';
import type { Lobby } from './types';

/**
 * Arkadaşın bulunduğu odanın adresi. Oda adları benzersiz olduğundan adla eşleştirilir;
 * oda bulunamazsa (kapanmış ya da liste alınamadı) lobi listesine gidilir.
 */
export async function resolveFriendRoomPath(roomName: string): Promise<string> {
  try {
    const response = await api.get<Lobby[]>('/lobbies');
    const needle = roomName.trim().toLocaleLowerCase('tr-TR');
    const room = unwrapData<Lobby[]>(response.data).find((lobby) => lobby.name.trim().toLocaleLowerCase('tr-TR') === needle);
    if (room) return `/app/focus/${room.id}`;
  } catch {
    // Ağ hatasında lobiye düşülür.
  }
  return '/app/lobbies';
}
