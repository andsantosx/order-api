import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinItemsToCoupons1779290000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona coluna min_items com valor padrão 2 (compatível com cupons existentes)
    await queryRunner.query(`
      ALTER TABLE "coupons"
      ADD COLUMN "min_items" integer NOT NULL DEFAULT 2
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coupons"
      DROP COLUMN "min_items"
    `);
  }
}
