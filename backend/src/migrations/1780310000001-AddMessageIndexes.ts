import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Sik sorgulanan mesaj kolonlari icin indeksler:
 * oda sohbeti (roomName + createdAt), DM gecmisi (senderId/receiverId) ve okunmamis DM (receiverId + isRead).
 */
export class AddMessageIndexes1780310000001 implements MigrationInterface {
    name = 'AddMessageIndexes1780310000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_message_room_created" ON "message" ("roomName", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_direct_messages_sender_receiver" ON "direct_messages" ("senderId", "receiverId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_direct_messages_receiver_read" ON "direct_messages" ("receiverId", "isRead")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_direct_messages_receiver_read"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_direct_messages_sender_receiver"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_room_created"`);
    }

}
