import { MigrationInterface, QueryRunner } from "typeorm";

/** Faz 5: uygulama ustu duyurular. Tekrar calistirmak guvenlidir. */
export class AddAnnouncements1780100000000 implements MigrationInterface {
    name = 'AddAnnouncements1780100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "announcements" (
            "id" SERIAL PRIMARY KEY,
            "message" character varying(280) NOT NULL,
            "tone" character varying(10) NOT NULL DEFAULT 'info',
            "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "createdById" integer REFERENCES "users"("id") ON DELETE SET NULL
        )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_announcements_window" ON "announcements" ("startsAt", "endsAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "announcements"`);
    }

}
