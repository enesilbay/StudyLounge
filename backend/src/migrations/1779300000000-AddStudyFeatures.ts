import { MigrationInterface, QueryRunner } from "typeorm";

/** Faz 2: dersler, oturum gecmisi, hedefler, gorevler ve planli oturumlar. Tekrar calistirmak guvenlidir. */
export class AddStudyFeatures1779300000000 implements MigrationInterface {
    name = 'AddStudyFeatures1779300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dailyGoalMinutes" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "weeklyGoalMinutes" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "daily_analytics" ADD COLUMN IF NOT EXISTS "goalRewarded" boolean NOT NULL DEFAULT false`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "subjects" (
            "id" SERIAL PRIMARY KEY,
            "name" character varying(40) NOT NULL,
            "color" character varying(16) NOT NULL DEFAULT 'teal',
            "archived" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "study_sessions" (
            "id" SERIAL PRIMARY KEY,
            "roomName" character varying(120),
            "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "endedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "minutes" integer NOT NULL DEFAULT 0,
            "creditedMinutes" integer NOT NULL DEFAULT 0,
            "source" character varying(10) NOT NULL DEFAULT 'mobile',
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            "subjectId" integer REFERENCES "subjects"("id") ON DELETE SET NULL
        )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_study_sessions_user_started" ON "study_sessions" ("userId", "startedAt")`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "tasks" (
            "id" SERIAL PRIMARY KEY,
            "title" character varying(200) NOT NULL,
            "done" boolean NOT NULL DEFAULT false,
            "current" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "doneAt" TIMESTAMP WITH TIME ZONE,
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            "subjectId" integer REFERENCES "subjects"("id") ON DELETE SET NULL
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "scheduled_sessions" (
            "id" SERIAL PRIMARY KEY,
            "title" character varying(80) NOT NULL,
            "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "durationMinutes" integer NOT NULL DEFAULT 50,
            "reminderSentAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "ownerId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            "lobbyId" integer REFERENCES "lobbies"("id") ON DELETE SET NULL
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "scheduled_session_invites" (
            "id" SERIAL PRIMARY KEY,
            "status" character varying(10) NOT NULL DEFAULT 'pending',
            "sessionId" integer REFERENCES "scheduled_sessions"("id") ON DELETE CASCADE,
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "UQ_scheduled_session_invites_session_user" UNIQUE ("sessionId", "userId")
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_session_invites"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_sessions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "study_sessions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "subjects"`);
        await queryRunner.query(`ALTER TABLE "daily_analytics" DROP COLUMN IF EXISTS "goalRewarded"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "weeklyGoalMinutes"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "dailyGoalMinutes"`);
    }

}
