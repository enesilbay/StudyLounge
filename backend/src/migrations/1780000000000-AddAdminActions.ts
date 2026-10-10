import { MigrationInterface, QueryRunner } from "typeorm";

/** Faz 5: yonetici islem kaydi. Yonetici ya da hedef silinse de kayit kalir. Tekrar calistirmak guvenlidir. */
export class AddAdminActions1780000000000 implements MigrationInterface {
    name = 'AddAdminActions1780000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "admin_actions" (
            "id" SERIAL PRIMARY KEY,
            "adminLabel" character varying(80),
            "targetLabel" character varying(80),
            "action" character varying(30) NOT NULL,
            "reason" character varying(500),
            "details" jsonb,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "adminId" integer REFERENCES "users"("id") ON DELETE SET NULL,
            "targetId" integer REFERENCES "users"("id") ON DELETE SET NULL
        )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_actions_createdAt" ON "admin_actions" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_actions_target" ON "admin_actions" ("targetId", "createdAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "admin_actions"`);
    }

}
