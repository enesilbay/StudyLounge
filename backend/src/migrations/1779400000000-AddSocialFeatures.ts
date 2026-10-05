import { MigrationInterface, QueryRunner } from "typeorm";

/** Faz 3: rol/susturma/yasak, engelleme, şikayet ve haftalık lig sonuçları. Tekrar çalıştırmak güvenlidir. */
export class AddSocialFeatures1779400000000 implements MigrationInterface {
    name = 'AddSocialFeatures1779400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying(10) NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mutedUntil" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP WITH TIME ZONE`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "blocks" (
            "id" SERIAL PRIMARY KEY,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "blockerId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            "blockedId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "UQ_blocks_blocker_blocked" UNIQUE ("blockerId", "blockedId")
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "reports" (
            "id" SERIAL PRIMARY KEY,
            "reason" character varying(20) NOT NULL,
            "details" character varying(500),
            "messageId" integer,
            "messageText" character varying(2000),
            "roomName" character varying(120),
            "status" character varying(10) NOT NULL DEFAULT 'open',
            "resolvedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "reporterId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            "targetId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            "resolvedById" integer REFERENCES "users"("id") ON DELETE SET NULL
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "weekly_results" (
            "id" SERIAL PRIMARY KEY,
            "weekStart" date NOT NULL,
            "rank" integer NOT NULL,
            "minutes" integer NOT NULL,
            "reward" integer NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "UQ_weekly_results_week_user" UNIQUE ("weekStart", "userId")
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "weekly_results"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reports"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "blocks"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "bannedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "mutedUntil"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    }

}
