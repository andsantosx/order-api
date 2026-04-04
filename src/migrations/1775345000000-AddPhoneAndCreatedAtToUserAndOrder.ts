import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneAndCreatedAtToUserAndOrder1775345000000 implements MigrationInterface {
    name = 'AddPhoneAndCreatedAtToUserAndOrder1775345000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add phone to users
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" character varying`);
        
        // Add created_at to users (with default now() for existing rows)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        
        // Add phone to orders
        await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "phone" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    }
}
