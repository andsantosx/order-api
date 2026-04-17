import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNeighborhoodToShippingAddress1776394881146 implements MigrationInterface {
  name = 'AddNeighborhoodToShippingAddress1776394881146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shipping_addresses" ADD "neighborhood" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shipping_addresses" DROP COLUMN "neighborhood"`);
  }
}
