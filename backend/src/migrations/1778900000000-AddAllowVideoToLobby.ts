import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAllowVideoToLobby1778900000000 implements MigrationInterface {
    name = 'AddAllowVideoToLobby1778900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lobbies" ADD COLUMN IF NOT EXISTS "allowVideo" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lobbies" DROP COLUMN "allowVideo"`);
    }

}
