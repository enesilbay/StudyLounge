import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Faz 5: yonetim paneli icin kullanici kayit tarihi ve son gorulme.
 * Eski hesaplar kayit tarihi olarak migration anini alir; son gorulme bos baslar.
 * Tekrar calistirmak guvenlidir.
 */
export class AddActivityColumnsToUser1779900000000 implements MigrationInterface {
    name = 'AddActivityColumnsToUser1779900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastSeenAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "createdAt"`);
    }

}
