import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetFields1775400000000 implements MigrationInterface {
  name = 'AddPasswordResetFields1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const hasCodeColumn = table?.findColumnByName('reset_password_code');
    const hasExpiresColumn = table?.findColumnByName('reset_password_expires_at');

    if (!hasCodeColumn) {
      await queryRunner.query(`ALTER TABLE "users" ADD "reset_password_code" character varying`);
    }
    if (!hasExpiresColumn) {
      await queryRunner.query(`ALTER TABLE "users" ADD "reset_password_expires_at" TIMESTAMP`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const hasCodeColumn = table?.findColumnByName('reset_password_code');
    const hasExpiresColumn = table?.findColumnByName('reset_password_expires_at');

    if (hasCodeColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_code"`);
    }
    if (hasExpiresColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_expires_at"`);
    }
  }
}
