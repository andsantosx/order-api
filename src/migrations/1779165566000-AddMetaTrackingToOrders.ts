import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetaTrackingToOrders1779165566000 implements MigrationInterface {
  name = 'AddMetaTrackingToOrders1779165566000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "fbp" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "fbc" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "ip_address" character varying`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "user_agent" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "user_agent"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "ip_address"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fbc"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fbp"`);
  }
}
