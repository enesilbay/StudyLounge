import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Oda adi benzersiz olur (buyuk/kucuk harf duyarsiz). Sohbet, tahta, sayac ve RTC odayi
 * adla buldugu icin ayni adli iki oda birbirinin icerigine sizabiliyordu.
 * Adlar bastaki/sondaki bosluklar atilarak karsilastirilir (servis de yeni adlari kirpiyor).
 * Mevcut kopyalar ilk oda (en kucuk id) haric " (2)", " (3)"... eklenerek yeniden adlandirilir;
 * sohbet gecmisi oda adiyla tutuldugu icin o odanin mesajlari da yeni ada tasinir. Birebir ayni
 * adli kopyalarin mesajlari zaten ayirt edilemez, onlar yerinde kalir. Ardindan kalan adlar
 * kirpilir ve LOWER(name) uzerine unique indeks kurulur. Tekrar calistirmak guvenlidir.
 */
export class UniqueLobbyName1780310000000 implements MigrationInterface {
    name = 'UniqueLobbyName1780310000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            DECLARE r record; n integer; base text; candidate text; shared boolean;
            BEGIN
                FOR r IN
                    SELECT id, name FROM (
                        SELECT id, name, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY id) AS rn
                        FROM "lobbies"
                    ) t WHERE rn > 1 ORDER BY id
                LOOP
                    base := TRIM(r.name);
                    n := 2;
                    LOOP
                        candidate := base || ' (' || n || ')';
                        EXIT WHEN NOT EXISTS (SELECT 1 FROM "lobbies" WHERE LOWER(TRIM(name)) = LOWER(candidate));
                        n := n + 1;
                    END LOOP;
                    shared := EXISTS (SELECT 1 FROM "lobbies" WHERE name = r.name AND id <> r.id);
                    UPDATE "lobbies" SET name = candidate WHERE id = r.id;
                    IF NOT shared THEN
                        UPDATE "message" SET "roomName" = candidate WHERE "roomName" = r.name;
                    END IF;
                END LOOP;

                FOR r IN SELECT id, name FROM "lobbies" WHERE name <> TRIM(name) LOOP
                    UPDATE "lobbies" SET name = TRIM(r.name) WHERE id = r.id;
                    UPDATE "message" SET "roomName" = TRIM(r.name) WHERE "roomName" = r.name;
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
