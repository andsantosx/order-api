import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchemaFix1775340058047 implements MigrationInterface {
    name = 'InitialSchemaFix1775340058047'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable("admin_audit_logs");
        if (!hasTable) {
            await queryRunner.query(`CREATE TABLE "admin_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "adminId" character varying NOT NULL, "adminEmail" character varying NOT NULL, "action" character varying NOT NULL, "method" character varying NOT NULL, "path" character varying NOT NULL, "resourceId" text, "payload" json, "prevValues" json, "ip" character varying NOT NULL, "userAgent" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de7a8fc2fbb525484c71a86bb96" PRIMARY KEY ("id"))`);
            await queryRunner.query(`CREATE INDEX "IDX_a139edf85d191fb20890356d73" ON "admin_audit_logs" ("adminId") `);
            await queryRunner.query(`CREATE INDEX "IDX_5d49c245604bbfa780a30ae97d" ON "admin_audit_logs" ("action") `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable("admin_audit_logs");
        if (hasTable) {
            await queryRunner.query(`DROP INDEX "public"."IDX_5d49c245604bbfa780a30ae97d"`);
            await queryRunner.query(`DROP INDEX "public"."IDX_a139edf85d191fb20890356d73"`);
            await queryRunner.query(`DROP TABLE "admin_audit_logs"`);
        }
    }

}
