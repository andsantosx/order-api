import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressNumber1776301344456 implements MigrationInterface {
  name = 'AddAddressNumber1776301344456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add as nullable first
    await queryRunner.query('ALTER TABLE "shipping_addresses" ADD "number" character varying(20)');
    await queryRunner.query('ALTER TABLE "user_addresses" ADD "number" character varying(20)');

    // Update existing records
    await queryRunner.query(
      `UPDATE "shipping_addresses" SET "number" = 'S/N' WHERE "number" IS NULL`,
    );
    await queryRunner.query(`UPDATE "user_addresses" SET "number" = 'S/N' WHERE "number" IS NULL`);

    // Make NOT NULL
    await queryRunner.query('ALTER TABLE "shipping_addresses" ALTER COLUMN "number" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "user_addresses" ALTER COLUMN "number" SET NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "user_addresses" DROP COLUMN "number"');
    await queryRunner.query('ALTER TABLE "shipping_addresses" DROP COLUMN "number"');
  }
}
