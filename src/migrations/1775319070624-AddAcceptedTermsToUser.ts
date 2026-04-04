import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAcceptedTermsToUser1775319070624 implements MigrationInterface {
    name = 'AddAcceptedTermsToUser1775319070624'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("users");
        const hasColumn = table?.findColumnByName("accepted_terms");
        
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "users" ADD "accepted_terms" boolean NOT NULL DEFAULT false`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("users");
        const hasColumn = table?.findColumnByName("accepted_terms");

        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "accepted_terms"`);
        }
    }

}
