import { Injectable } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { LobbiesService } from '../lobbies/lobbies.service';
import { SensorsGateway } from '../sensors.gateway';

/** Yönetici: oda listesi, kilitleme, sahip değiştirme ve kapatma. Her işlem kayda yazılır. */
@Injectable()
export class AdminRoomsService {
  constructor(
    private readonly lobbies: LobbiesService,
    private readonly gateway: SensorsGateway,
    private readonly audit: AdminAuditService,
  ) {}

  list() {
    return this.lobbies.adminList();
  }

  async setLocked(adminId: number, id: number, locked: boolean, reason?: string) {
    const members = this.gateway.roomMemberIds((await this.lobbies.adminGet(id)).name);
    const lobby = await this.lobbies.adminSetLocked(id, locked, members);
    this.gateway.announceRoomLock(lobby.name, locked);
    await this.audit.record({
      adminId,
      targetLabel: lobby.name,
      action: locked ? 'room_lock' : 'room_unlock',
      reason,
      details: { roomId: lobby.id, roomName: lobby.name },
    });
    return { id: lobby.id, isLocked: locked };
  }

  async transferOwner(adminId: number, id: number, newOwnerId: number, reason?: string) {
    const { lobby, previous, newOwner } = await this.lobbies.adminTransferOwner(id, newOwnerId);
    await this.audit.record({
      adminId,
      targetId: newOwner.id,
      targetLabel: lobby.name,
      action: 'room_owner',
      reason,
      details: {
        roomId: lobby.id,
        roomName: lobby.name,
        from: previous?.username ?? null,
        to: newOwner.username,
      },
    });
    return { id: lobby.id, owner: { id: newOwner.id, username: newOwner.username, fullName: newOwner.fullName } };
  }

  async close(adminId: number, id: number, reason?: string) {
    const lobby = await this.lobbies.adminGet(id);
    const memberCount = this.gateway.roomMemberIds(lobby.name).length;
    await this.gateway.evictRoom(lobby.name, 'Oda bir yönetici tarafından kapatıldı.');
    await this.lobbies.adminClose(id);
    await this.audit.record({
      adminId,
      targetLabel: lobby.name,
      action: 'room_close',
      reason,
      details: { roomId: lobby.id, roomName: lobby.name, memberCount },
    });
    return { id: lobby.id, closed: true };
  }
}
