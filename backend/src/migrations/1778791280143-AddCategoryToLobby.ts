import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryToLobby1778791280143 implements MigrationInterface {
    name = 'AddCategoryToLobby1778791280143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lobbies" DROP CONSTRAINT "FK_lobbies_owner"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_message_user"`);
        await queryRunner.query(`ALTER TABLE "daily_analytics" DROP CONSTRAINT "FK_daily_analytics_user"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_friendships_sender"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_friendships_receiver"`);
        await queryRunner.query(`ALTER TABLE "lobbies" ADD "category" character varying`);
        await queryRunner.query(`ALTER TABLE "lobbies" ADD CONSTRAINT "FK_272d67d8bfb838676839d490790" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_446251f8ceb2132af01b68eb593" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_analytics" ADD CONSTRAINT "FK_d459e917b534d5e30667983510c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_02ebdc40b6af5b1621300a3bf38" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_76977c4ed1415e3b1cdf7848a8c" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_76977c4ed1415e3b1cdf7848a8c"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_02ebdc40b6af5b1621300a3bf38"`);
        await queryRunner.query(`ALTER TABLE "daily_analytics" DROP CONSTRAINT "FK_d459e917b534d5e30667983510c"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_446251f8ceb2132af01b68eb593"`);
        await queryRunner.query(`ALTER TABLE "lobbies" DROP CONSTRAINT "FK_272d67d8bfb838676839d490790"`);
        await queryRunner.query(`ALTER TABLE "lobbies" DROP COLUMN "category"`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_friendships_receiver" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_friendships_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_analytics" ADD CONSTRAINT "FK_daily_analytics_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_message_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lobbies" ADD CONSTRAINT "FK_lobbies_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
