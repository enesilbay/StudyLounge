import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnlineStatusToUser1778792573394 implements MigrationInterface {
    name = 'AddOnlineStatusToUser1778792573394'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "isOnline" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "currentRoom" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "currentRoom"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isOnline"`);
    }

}
