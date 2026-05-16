import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGaClientIdToOrders1778891158342 implements MigrationInterface {
  name = 'AddGaClientIdToOrders1778891158342';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "ga_client_id" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "ga_client_id"`);
  }
}
