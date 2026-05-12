import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1778600000000 implements MigrationInterface {
  name = 'InitialSchema1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL NOT NULL,
        "username" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying,
        "isPremium" boolean NOT NULL DEFAULT false,
        "totalFocusMinutes" integer NOT NULL DEFAULT 0,
        "avatarUrl" character varying,
        "expoPushToken" character varying,
        "resetPasswordToken" character varying,
        "resetPasswordExpires" TIMESTAMP,
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lobbies" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "icon" character varying NOT NULL,
        "description" character varying,
        "activeUsers" integer NOT NULL DEFAULT 0,
        "isPrivate" boolean NOT NULL DEFAULT false,
        "passwordHash" character varying,
        "maxUsers" integer NOT NULL DEFAULT 50,
        "isPremiumOnly" boolean NOT NULL DEFAULT false,
        "ownerId" integer,
        CONSTRAINT "PK_lobbies_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "lobbies"
      ADD COLUMN IF NOT EXISTS "passwordHash" character varying
    `);
    await queryRunner.query(
      'ALTER TABLE "lobbies" DROP COLUMN IF EXISTS "password"',
    );
    await queryRunner.query(`
      ALTER TABLE "lobbies"
      ADD COLUMN IF NOT EXISTS "ownerId" integer
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "friendships" (
        "id" SERIAL NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "senderId" integer,
        "receiverId" integer,
        CONSTRAINT "PK_friendships_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_analytics" (
        "id" SERIAL NOT NULL,
        "date" date NOT NULL,
        "focusMinutes" integer NOT NULL DEFAULT 0,
        "hourlyDistribution" jsonb,
        "userId" integer,
        CONSTRAINT "PK_daily_analytics_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message" (
        "id" SERIAL NOT NULL,
        "text" character varying NOT NULL,
        "roomName" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "fileUrl" character varying,
        "fileName" character varying,
        "type" character varying NOT NULL DEFAULT 'text',
        "userId" integer,
        CONSTRAINT "PK_message_id" PRIMARY KEY ("id")
      )
    `);

    await this.replaceForeignKey(
      queryRunner,
      'lobbies',
      'ownerId',
      'FK_lobbies_owner',
      'users',
      'id',
      'SET NULL',
    );
    await this.replaceForeignKey(
      queryRunner,
      'friendships',
      'senderId',
      'FK_friendships_sender',
      'users',
      'id',
      'CASCADE',
    );
    await this.replaceForeignKey(
      queryRunner,
      'friendships',
      'receiverId',
      'FK_friendships_receiver',
      'users',
      'id',
      'CASCADE',
    );
    await this.replaceForeignKey(
      queryRunner,
      'daily_analytics',
      'userId',
      'FK_daily_analytics_user',
      'users',
      'id',
      'CASCADE',
    );
    await this.replaceForeignKey(
      queryRunner,
      'message',
      'userId',
      'FK_message_user',
      'users',
      'id',
      'SET NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_user"',
    );
    await queryRunner.query(
      'ALTER TABLE "daily_analytics" DROP CONSTRAINT IF EXISTS "FK_daily_analytics_user"',
    );
    await queryRunner.query(
      'ALTER TABLE "friendships" DROP CONSTRAINT IF EXISTS "FK_friendships_receiver"',
    );
    await queryRunner.query(
      'ALTER TABLE "friendships" DROP CONSTRAINT IF EXISTS "FK_friendships_sender"',
    );
    await queryRunner.query(
      'ALTER TABLE "lobbies" DROP CONSTRAINT IF EXISTS "FK_lobbies_owner"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "message"');
    await queryRunner.query('DROP TABLE IF EXISTS "daily_analytics"');
    await queryRunner.query('DROP TABLE IF EXISTS "friendships"');
    await queryRunner.query('DROP TABLE IF EXISTS "lobbies"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }

  private async replaceForeignKey(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    constraintName: string,
    referencedTable: string,
    referencedColumn: string,
    onDelete: 'CASCADE' | 'SET NULL',
  ): Promise<void> {
    await queryRunner.query(`
        DO $$
        DECLARE existing_constraint text;
        BEGIN
          FOR existing_constraint IN
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND tc.table_name = '${tableName}'
              AND kcu.column_name = '${columnName}'
          LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', '${tableName}', existing_constraint);
          END LOOP;
        END $$;
      `);

    await queryRunner.query(
      `ALTER TABLE "${tableName}"
       ADD CONSTRAINT "${constraintName}"
       FOREIGN KEY ("${columnName}") REFERENCES "${referencedTable}"("${referencedColumn}")
       ON DELETE ${onDelete} ON UPDATE NO ACTION`,
    );
  }
}
