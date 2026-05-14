import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGamification1778793570725 implements MigrationInterface {
    name = 'AddGamification1778793570725'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "coins" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "currentStreak" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "bestStreak" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastFocusDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "ownedColors" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD "ownedIcons" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD "badges" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD "equippedBubbleColor" character varying NOT NULL DEFAULT '#4F46E5'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "equippedIcon" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "equippedIcon"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "equippedBubbleColor"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "badges"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ownedIcons"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ownedColors"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastFocusDate"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bestStreak"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "currentStreak"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "coins"`);
    }

}
