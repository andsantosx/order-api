import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateClothingSizes1779250000000 implements MigrationInterface {
  name = 'UpdateClothingSizes1779250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Revert any hybrid sizes back to Brazilian sizes (just in case they were migrated)
    await queryRunner.query(`UPDATE "sizes" SET name = 'P' WHERE name = 'S=P' AND type = 'clothing'`);
    await queryRunner.query(`UPDATE "sizes" SET name = 'M' WHERE name = 'M=M' AND type = 'clothing'`);
    await queryRunner.query(`UPDATE "sizes" SET name = 'G' WHERE name = 'L=G' AND type = 'clothing'`);
    await queryRunner.query(`UPDATE "sizes" SET name = 'GG' WHERE name = 'XL=GG' AND type = 'clothing'`);

    // 2. Remove any XXL=XG and XXXL=2XG size entries (just in case they were migrated)
    await queryRunner.query(`DELETE FROM "sizes" WHERE name IN ('XXL=XG', 'XXXL=2XG') AND type = 'clothing'`);

    // 3. Ensure the base Brazilian sizes exist
    const baseSizes = ['P', 'M', 'G', 'GG', 'XG', '2XG'];
    for (const size of baseSizes) {
      await queryRunner.query(`
        INSERT INTO "sizes" (name, type)
        SELECT '${size}', 'clothing'
        WHERE NOT EXISTS (
          SELECT 1 FROM "sizes" WHERE name = '${size}' AND type = 'clothing'
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new sizes XG and 2XG
    await queryRunner.query(`DELETE FROM "sizes" WHERE name IN ('XG', '2XG') AND type = 'clothing'`);
  }
}
