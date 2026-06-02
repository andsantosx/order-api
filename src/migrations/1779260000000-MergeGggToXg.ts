import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeGggToXg1779260000000 implements MigrationInterface {
  name = 'MergeGggToXg1779260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Find the ID of the 'GGG' size
    const gggSizes = await queryRunner.query(`SELECT id FROM "sizes" WHERE name = 'GGG' AND type = 'clothing'`);
    const gggId = gggSizes[0]?.id;

    // 2. Find the ID of any duplicate 'XG' size (other than GGG if it was already renamed)
    const xgSizes = await queryRunner.query(`SELECT id FROM "sizes" WHERE name = 'XG' AND type = 'clothing'`);
    
    let xgIdToClean = null;
    if (gggId) {
      const duplicateXG = xgSizes.find((s: any) => s.id !== gggId);
      if (duplicateXG) {
        xgIdToClean = duplicateXG.id;
      }
    }

    if (xgIdToClean && gggId) {
      // Move any relationships from the duplicate 'XG' to the main 'GGG' ID
      await queryRunner.query(`
        UPDATE "product_sizes" 
        SET "size_id" = ${gggId} 
        WHERE "size_id" = ${xgIdToClean}
        AND NOT EXISTS (
          SELECT 1 FROM "product_sizes" WHERE "size_id" = ${gggId} AND "product_id" = "product_sizes"."product_id"
        )
      `);
      // Delete any duplicate relations that couldn't be updated due to unique constraints
      await queryRunner.query(`DELETE FROM "product_sizes" WHERE "size_id" = ${xgIdToClean}`);
      // Delete the duplicate size row
      await queryRunner.query(`DELETE FROM "sizes" WHERE id = ${xgIdToClean}`);
    }

    // 3. Rename 'GGG' to 'XG'
    await queryRunner.query(`UPDATE "sizes" SET name = 'XG' WHERE name = 'GGG' AND type = 'clothing'`);

    // 4. Ensure '2XG' exists
    await queryRunner.query(`
      INSERT INTO "sizes" (name, type)
      SELECT '2XG', 'clothing'
      WHERE NOT EXISTS (
        SELECT 1 FROM "sizes" WHERE name = '2XG' AND type = 'clothing'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename 'XG' back to 'GGG'
    await queryRunner.query(`UPDATE "sizes" SET name = 'GGG' WHERE name = 'XG' AND type = 'clothing'`);
  }
}
