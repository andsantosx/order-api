import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderStatusHistoryAndTracking1775361000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabela de histórico de mudanças de status
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_status_history" (
        "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id"       uuid NOT NULL,
        "from_status_id" integer,
        "to_status_id"   integer NOT NULL,
        "changed_by_id"  character varying,
        "changed_by_role" character varying NOT NULL DEFAULT 'SYSTEM',
        "notes"          text,
        "tracking_code"  character varying,
        "tracking_url"   character varying,
        "created_at"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_status_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_osh_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_osh_from_status" FOREIGN KEY ("from_status_id") REFERENCES "status"("id"),
        CONSTRAINT "FK_osh_to_status" FOREIGN KEY ("to_status_id") REFERENCES "status"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_osh_order_id" ON "order_status_history" ("order_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_osh_created_at" ON "order_status_history" ("created_at")`);

    // 2. Adicionar campos de rastreio e timestamps de ciclo de vida na tabela orders
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_code" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_url" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_history" CASCADE`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "tracking_code"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "tracking_url"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shipped_at"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivered_at"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "cancelled_at"`);
  }
}
