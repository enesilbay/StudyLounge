import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLobbyAccess1779100000000 implements MigrationInterface {
    name = 'AddLobbyAccess1779100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Yabanci anahtarlar tablo tanimina gomulu: tablo (or. synchronize ile) zaten varsa hicbir sey eklenmez.
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "lobby_access" (
            "id" SERIAL NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "lobbyId" integer REFERENCES "lobbies"("id") ON DELETE CASCADE,
            "userId" integer REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "UQ_lobby_access_lobby_user" UNIQUE ("lobbyId", "userId"),
            CONSTRAINT "PK_lobby_access_id" PRIMARY KEY ("id")
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "lobby_access"`);
    }

}
