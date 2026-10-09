import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Hesap silme: kullanici silinince ozel mesajlari da silinir.
 * direct_messages'in users'a bagli yabanci anahtarlari ON DELETE NO ACTION ile kurulmustu;
 * bu yuzden DM'i olan kullanici silinemiyordu. Kisitlama adlari ortama gore farkli
 * olabilecegi icin (synchronize ile kurulan veritabani) adlar katalogdan bulunur.
 * Tekrar calistirmak guvenlidir.
 */
export class CascadeDirectMessagesOnUserDelete1779600000000 implements MigrationInterface {
    name = 'CascadeDirectMessagesOnUserDelete1779600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.recreate(queryRunner, 'CASCADE');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.recreate(queryRunner, 'NO ACTION');
    }

    private async recreate(queryRunner: QueryRunner, onDelete: 'CASCADE' | 'NO ACTION') {
        await queryRunner.query(`
            DO $$
            DECLARE fk record;
            BEGIN
                FOR fk IN
                    SELECT con.conname
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    WHERE rel.relname = 'direct_messages' AND con.contype = 'f'
                      AND con.confrelid = 'users'::regclass
                LOOP
                    EXECUTE format('ALTER TABLE "direct_messages" DROP CONSTRAINT %I', fk.conname);
                END LOOP;
            END $$;
        `);
        await queryRunner.query(`ALTER TABLE "direct_messages" ADD CONSTRAINT "FK_direct_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE ${onDelete}`);
        await queryRunner.query(`ALTER TABLE "direct_messages" ADD CONSTRAINT "FK_direct_messages_receiver" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE ${onDelete}`);
    }

}
