import { MigrationInterface, QueryRunner } from "typeorm";

/** Faz 5: yonetim paneli genel bakisi icin kullanici kayit tarihi. Eski hesaplar migration anini alir. Tekrar calistirmak guvenlidir. */
export class AddCreatedAtToUser1779900000000 implements MigrationInterface {
    name = 'AddCreatedAtToUser1779900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "createdAt"`);
    }

}
