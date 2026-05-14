import { MigrationInterface, QueryRunner } from "typeorm";

export class DirectMessage1778793345692 implements MigrationInterface {
    name = 'DirectMessage1778793345692'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "direct_messages" ("id" SERIAL NOT NULL, "text" text NOT NULL, "type" character varying NOT NULL DEFAULT 'text', "fileUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "senderId" integer, "receiverId" integer, CONSTRAINT "PK_8373c1bb93939978ef05ae650d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "direct_messages" ADD CONSTRAINT "FK_7aedd4c96c0e01b95b87b8cea5a" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "direct_messages" ADD CONSTRAINT "FK_c13c61aa642b3debd5c2c53bbbd" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "direct_messages" DROP CONSTRAINT "FK_c13c61aa642b3debd5c2c53bbbd"`);
        await queryRunner.query(`ALTER TABLE "direct_messages" DROP CONSTRAINT "FK_7aedd4c96c0e01b95b87b8cea5a"`);
        await queryRunner.query(`DROP TABLE "direct_messages"`);
    }

}
