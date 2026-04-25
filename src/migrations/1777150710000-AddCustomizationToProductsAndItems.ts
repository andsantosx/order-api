import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomizationToProductsAndItems1777150710000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_customizable to products
    await queryRunner.query(
      `ALTER TABLE "products" ADD "is_customizable" boolean NOT NULL DEFAULT false`,
    );

    // Add custom_name and custom_number to order_items
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "custom_name" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "custom_number" character varying(10)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "custom_number"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "custom_name"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "is_customizable"`);
  }
}
