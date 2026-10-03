import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Entity'lerde olup hicbir migration'da olusturulmayan kolonlar.
 * Gelistirme ortaminda synchronize ile olustuklari icin fark edilmemisti;
 * bos bir veritabaninda (or. yeni Render PostgreSQL) bunlar olmadan giris,
 * magaza ve DM okundu bilgisi calismaz. Tekrar calistirilmasi guvenlidir.
 */
export class AddMissingEntityColumns1779000000000 implements MigrationInterface {
  name = 'AddMissingEntityColumns1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationToken" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ownedSoundPacks" text NOT NULL DEFAULT 'classic'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedSoundPack" character varying NOT NULL DEFAULT 'classic'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ownedProfileFrames" text NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedProfileFrame" character varying NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lobbies" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "isRead" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "direct_messages" DROP COLUMN IF EXISTS "isRead"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lobbies" DROP COLUMN IF EXISTS "createdAt"`,
    );
    for (const column of [
      'equippedProfileFrame',
      'ownedProfileFrames',
      'equippedSoundPack',
      'ownedSoundPacks',
      'emailVerificationToken',
      'isEmailVerified',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN IF EXISTS "${column}"`,
      );
    }
  }
}
