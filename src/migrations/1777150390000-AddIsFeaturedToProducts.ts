import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFeaturedToProducts1777150390000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "is_featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_is_featured" ON "products" ("is_featured")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_is_featured"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "is_featured"`);
  }
}
