import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCouponUserUsageTable1779280000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de controle de uso de cupom por usuário
    await queryRunner.query(`
      CREATE TABLE "coupon_user_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "coupon_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "use_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coupon_user_usage" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_coupon_user" UNIQUE ("coupon_id", "user_id"),
        CONSTRAINT "FK_coupon_user_usage_coupon" FOREIGN KEY ("coupon_id")
          REFERENCES "coupons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_user_usage_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Índices para buscas rápidas
    await queryRunner.query(`
      CREATE INDEX "IDX_coupon_user_usage_coupon" ON "coupon_user_usage" ("coupon_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_coupon_user_usage_user" ON "coupon_user_usage" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_coupon_user_usage_user"`);
    await queryRunner.query(`DROP INDEX "IDX_coupon_user_usage_coupon"`);
    await queryRunner.query(`DROP TABLE "coupon_user_usage"`);
  }
}
