import { MigrationInterface, QueryRunner } from 'typeorm';

export class CentralizeStatus1775355000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cleanup previous failed attempts if any
    await queryRunner.query(`DROP TABLE IF EXISTS "status" CASCADE`);

    // 1. Create Status table with composite unique constraint
    await queryRunner.query(`
            CREATE TABLE "status" (
                "id" integer NOT NULL,
                "name" character varying NOT NULL,
                "label" character varying NOT NULL,
                "type" character varying NOT NULL,
                CONSTRAINT "PK_status_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_status_name_type" UNIQUE ("name", "type")
            )
        `);

    // 2. Seed initial statuses
    await queryRunner.query(`
            INSERT INTO "status" (id, name, label, type) VALUES
            (1, 'PENDING', 'Pendente', 'ORDER'),
            (2, 'PROCESSING', 'Processando', 'ORDER'),
            (3, 'PAID', 'Pago', 'ORDER'),
            (4, 'SHIPPED', 'Enviado', 'ORDER'),
            (5, 'DELIVERED', 'Entregue', 'ORDER'),
            (6, 'CANCELLED', 'Cancelado', 'ORDER'),
            (7, 'REFUNDED', 'Reembolsado', 'ORDER'),
            (101, 'PENDING', 'Novo', 'CONTACT'),
            (102, 'REPLIED', 'Respondido', 'CONTACT'),
            (103, 'CLOSED', 'Fechado', 'CONTACT')
        `);

    // 3. Update orders table
    // We drop columns and recreate for a clean migration given it's early stage
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "status_id" integer`);
    await queryRunner.query(`UPDATE "orders" SET "status_id" = 1 WHERE "status_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_status" FOREIGN KEY ("status_id") REFERENCES "status"("id")`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_status_enum"`);

    // 4. Update contact_messages table
    await queryRunner.query(`ALTER TABLE "contact_messages" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(
      `ALTER TABLE "contact_messages" ADD COLUMN IF NOT EXISTS "status_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_messages" ADD COLUMN IF NOT EXISTS "response" text`,
    );
    await queryRunner.query(
      `UPDATE "contact_messages" SET "status_id" = 101 WHERE "status_id" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "contact_messages" ALTER COLUMN "status_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "contact_messages" ADD CONSTRAINT "FK_contact_messages_status" FOREIGN KEY ("status_id") REFERENCES "status"("id")`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_messages_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert orders
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_status"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "status_id"`);
    await queryRunner.query(
      `CREATE TYPE "orders_status_enum" AS ENUM('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "status" "orders_status_enum" DEFAULT 'PENDING'`,
    );

    // Revert contact_messages
    await queryRunner.query(
      `ALTER TABLE "contact_messages" DROP CONSTRAINT IF EXISTS "FK_contact_messages_status"`,
    );
    await queryRunner.query(`ALTER TABLE "contact_messages" DROP COLUMN IF EXISTS "status_id"`);
    await queryRunner.query(`ALTER TABLE "contact_messages" DROP COLUMN IF EXISTS "response"`);
    await queryRunner.query(
      `CREATE TYPE "contact_messages_status_enum" AS ENUM('pending', 'replied', 'closed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_messages" ADD "status" "contact_messages_status_enum" DEFAULT 'pending'`,
    );

    // Drop status table
    await queryRunner.query(`DROP TABLE IF EXISTS "status" CASCADE`);
  }
}
