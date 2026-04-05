import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcceptedTermsToOrder1775349907579 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safe check and add accepted_terms to orders
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "accepted_terms" boolean NOT NULL DEFAULT false`,
    );

    // Also just ensuring zip_code exists on shipping_addresses since we changed how it maps
    await queryRunner.query(
      `ALTER TABLE "shipping_addresses" ADD COLUMN IF NOT EXISTS "zip_code" character varying(10)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shipping_addresses" DROP COLUMN IF EXISTS "zip_code"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "accepted_terms"`);
  }
}
