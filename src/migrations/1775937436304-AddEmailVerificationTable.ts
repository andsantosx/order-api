import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationTable1775937436304 implements MigrationInterface {
  name = 'AddEmailVerificationTable1775937436304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('email_verifications');
    if (!hasTable) {
      await queryRunner.query(
        `CREATE TABLE "email_verifications" ("email" character varying NOT NULL, "code" character varying(6) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_44e5cfea68f87243cad38bb1b1f" PRIMARY KEY ("email"))`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('email_verifications');
    if (hasTable) {
      await queryRunner.query(`DROP TABLE "email_verifications"`);
    }
  }
}
