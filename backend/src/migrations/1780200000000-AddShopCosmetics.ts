import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Mağaza: profil kapağı, lamba rengi ve seri koruma.
 * Bütün kolonlar varsayılan değerli; mobil istemci bu alanları yok sayar.
 * Tekrar calistirmak guvenlidir.
 */
export class AddShopCosmetics1780200000000 implements MigrationInterface {
    name = 'AddShopCosmetics1780200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ownedProfileCovers" text NOT NULL DEFAULT 'none'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedProfileCover" character varying NOT NULL DEFAULT 'none'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ownedLampColors" text NOT NULL DEFAULT 'classic'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedLampColor" character varying NOT NULL DEFAULT 'classic'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streakFreezes" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "streakFreezes"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "equippedLampColor"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "ownedLampColors"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "equippedProfileCover"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "ownedProfileCovers"`);
    }

}
