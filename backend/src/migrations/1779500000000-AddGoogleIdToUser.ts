import { MigrationInterface, QueryRunner } from "typeorm";

/** Google ile giris: kullaniciya istege bagli, benzersiz googleId. Tekrar calistirmak guvenlidir. */
export class AddGoogleIdToUser1779500000000 implements MigrationInterface {
    name = 'AddGoogleIdToUser1779500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_googleId" ON "users" ("googleId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_googleId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId"`);
    }

}
