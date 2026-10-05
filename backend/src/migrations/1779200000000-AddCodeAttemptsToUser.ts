import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeAttemptsToUser1779200000000 implements MigrationInterface {
    name = 'AddCodeAttemptsToUser1779200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "codeAttempts" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "codeAttempts"`);
    }

}
