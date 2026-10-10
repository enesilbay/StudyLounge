import { MigrationInterface, QueryRunner } from "typeorm";

/** Faz 5: uygulama içi geri bildirim (hata bildir / öneri). Tekrar çalıştırmak güvenlidir. */
export class AddFeedback1779700000000 implements MigrationInterface {
    name = 'AddFeedback1779700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "feedback" (
            "id" SERIAL PRIMARY KEY,
            "kind" character varying(10) NOT NULL,
            "message" character varying(2000) NOT NULL,
            "page" character varying(200),
            "userAgent" character varying(300),
            "status" character varying(10) NOT NULL DEFAULT 'open',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "feedback"`);
    }

}
