import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressReference1776301556603 implements MigrationInterface {
  name = 'AddAddressReference1776301556603';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contact_messages" DROP CONSTRAINT "FK_contact_messages_status"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_osh_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_osh_created_at"`);
    await queryRunner.query(`ALTER TABLE "status" DROP CONSTRAINT "UQ_status_name_type"`);
    await queryRunner.query(
      `ALTER TABLE "shipping_addresses" ADD "reference" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "user_addresses" ADD "reference" character varying`);
    await queryRunner.query(`ALTER TABLE "user_addresses" DROP COLUMN "number"`);
    await queryRunner.query(`ALTER TABLE "user_addresses" ADD "number" character varying NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c7b64ef71899b161423c0d81f3" ON "status" ("name", "type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_messages" ADD CONSTRAINT "FK_b0cd3971e2591ed85b6aed561de" FOREIGN KEY ("status_id") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" ADD CONSTRAINT "FK_4cc3eef79a174685f67df658c2c" FOREIGN KEY ("from_status_id") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" ADD CONSTRAINT "FK_9ba005812adffb1048d0cd11b35" FOREIGN KEY ("to_status_id") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_03a801095cb90cf148e474cfcb7" FOREIGN KEY ("status_id") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_03a801095cb90cf148e474cfcb7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_9ba005812adffb1048d0cd11b35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_4cc3eef79a174685f67df658c2c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_messages" DROP CONSTRAINT "FK_b0cd3971e2591ed85b6aed561de"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_c7b64ef71899b161423c0d81f3"`);
    await queryRunner.query(`ALTER TABLE "user_addresses" DROP COLUMN "number"`);
    await queryRunner.query(
      `ALTER TABLE "user_addresses" ADD "number" character varying(20) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "user_addresses" DROP COLUMN "reference"`);
    await queryRunner.query(`ALTER TABLE "shipping_addresses" DROP COLUMN "reference"`);
    await queryRunner.query(
      `ALTER TABLE "status" ADD CONSTRAINT "UQ_status_name_type" UNIQUE ("name", "type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_osh_created_at" ON "order_status_history" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_osh_order_id" ON "order_status_history" ("order_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_status" FOREIGN KEY ("status_id") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_messages" ADD CONSTRAINT "FK_contact_messages_status" FOREIGN KEY ("status_id") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
