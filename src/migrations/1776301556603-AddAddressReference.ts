import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressReference1776301556603 implements MigrationInterface {
  name = 'AddAddressReference1776301556603';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shipping_addresses" ADD "reference" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "user_addresses" ADD "reference" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_addresses" DROP COLUMN "reference"`);
    await queryRunner.query(`ALTER TABLE "shipping_addresses" DROP COLUMN "reference"`);
  }
}
