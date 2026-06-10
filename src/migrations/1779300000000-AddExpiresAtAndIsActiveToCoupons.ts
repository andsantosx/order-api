import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiresAtAndIsActiveToCoupons1779300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coupons"
      ADD COLUMN "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN "expires_at" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coupons"
      DROP COLUMN "is_active",
      DROP COLUMN "expires_at"
    `);
  }
}
