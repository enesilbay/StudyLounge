import { MigrationInterface, QueryRunner } from "typeorm";

/** Faz 5: Premium satin alma (iyzico). Premium bitis tarihi ve odeme kayitlari. Tekrar calistirmak guvenlidir. */
export class AddPayments1779800000000 implements MigrationInterface {
    name = 'AddPayments1779800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "payments" (
            "id" SERIAL PRIMARY KEY,
            "planId" character varying(20) NOT NULL,
            "amount" numeric(10,2) NOT NULL,
            "currency" character varying(3) NOT NULL DEFAULT 'TRY',
            "status" character varying(10) NOT NULL DEFAULT 'pending',
            "conversationId" character varying(64) NOT NULL,
            "token" character varying(100),
            "providerPaymentId" character varying(64),
            "failureReason" character varying(300),
            "premiumUntil" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "completedAt" TIMESTAMP WITH TIME ZONE,
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_conversationId" ON "payments" ("conversationId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_token" ON "payments" ("token")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "premiumUntil"`);
    }

}
