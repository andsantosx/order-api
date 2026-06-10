import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponsTable1779270000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela de cupons
    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(20) NOT NULL,
        "discount_percentage" integer NOT NULL,
        "max_uses" integer NOT NULL,
        "used_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_coupon_code" UNIQUE ("code"),
        CONSTRAINT "PK_coupons" PRIMARY KEY ("id")
      )
    `);

    // Criar índice para busca rápida do código
    await queryRunner.query(`
      CREATE INDEX "IDX_coupons_code" ON "coupons" ("code")
    `);

    // 2. Adicionar colunas de cupom à tabela de pedidos (orders)
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ADD "coupon_id" uuid,
      ADD "coupon_code" character varying(20),
      ADD "discount_amount" bigint NOT NULL DEFAULT 0
    `);

    // Adicionar chave estrangeira
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_coupon" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chave estrangeira e colunas de orders
    await queryRunner.query(`
      ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_coupon"
    `);
    
    await queryRunner.query(`
      ALTER TABLE "orders" 
      DROP COLUMN "coupon_id",
      DROP COLUMN "coupon_code",
      DROP COLUMN "discount_amount"
    `);

    // Remover índice e tabela de cupons
    await queryRunner.query(`
      DROP INDEX "IDX_coupons_code"
    `);
    
    await queryRunner.query(`
      DROP TABLE "coupons"
    `);
  }
}
