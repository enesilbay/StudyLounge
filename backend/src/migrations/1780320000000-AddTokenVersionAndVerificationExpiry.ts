import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTokenVersionAndVerificationExpiry1780320000000 implements MigrationInterface {
    name = 'AddTokenVersionAndVerificationExpiry1780320000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationExpires" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationExpires"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "tokenVersion"`);
    }

}
