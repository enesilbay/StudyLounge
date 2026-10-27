import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Oda adi benzersiz olur (buyuk/kucuk harf duyarsiz). Sohbet, tahta, sayac ve RTC odayi
 * adla buldugu icin ayni adli iki oda birbirinin icerigine sizabiliyordu.
 * Mevcut kopyalar ilk oda (en kucuk id) haric " (2)", " (3)"... eklenerek yeniden adlandirilir,
 * sonra LOWER(name) uzerine unique indeks kurulur. Tekrar calistirmak guvenlidir.
 */
export class UniqueLobbyName1780310000000 implements MigrationInterface {
    name = 'UniqueLobbyName1780310000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            DECLARE r record; n integer; candidate text;
            BEGIN
                FOR r IN
                    SELECT id, name FROM (
                        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) AS rn
                        FROM "lobbies"
                    ) t WHERE rn > 1 ORDER BY id
                LOOP
                    n := 2;
                    LOOP
                        candidate := r.name || ' (' || n || ')';
                        EXIT WHEN NOT EXISTS (SELECT 1 FROM "lobbies" WHERE LOWER(name) = LOWER(candidate));
                        n := n + 1;
                    END LOOP;
                    UPDATE "lobbies" SET name = candidate WHERE id = r.id;
                END LOOP;
            END $$;
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_lobbies_name_lower" ON "lobbies" (LOWER("name"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Yeniden adlandirilan odalar eski adlarina donmez (kopya adlar bilgisi tutulmuyor).
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_lobbies_name_lower"`);
    }

}
