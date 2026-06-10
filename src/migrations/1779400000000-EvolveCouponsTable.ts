import { MigrationInterface, QueryRunner } from 'typeorm';

export class EvolveCouponsTable1779400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coupons" RENAME COLUMN "max_uses" TO "max_uses_per_user";
      
      ALTER TABLE "coupons"
      ADD COLUMN "max_uses_global" integer,
      ADD COLUMN "min_order_value_cents" integer,
      ADD COLUMN "max_discount_cents" integer,
      ADD COLUMN "first_order_only" boolean NOT NULL DEFAULT false,
      ALTER COLUMN "min_items" SET DEFAULT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coupons" RENAME COLUMN "max_uses_per_user" TO "max_uses";
      
      ALTER TABLE "coupons"
      DROP COLUMN "max_uses_global",
      DROP COLUMN "min_order_value_cents",
      DROP COLUMN "max_discount_cents",
      DROP COLUMN "first_order_only",
      ALTER COLUMN "min_items" SET DEFAULT 2;
    `);
  }
}
