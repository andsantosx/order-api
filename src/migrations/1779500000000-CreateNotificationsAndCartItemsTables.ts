import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsAndCartItemsTables1779500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela de notificações
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" varchar NOT NULL,
        "content" text NOT NULL,
        "type" varchar NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "link" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Índices para notificações
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user" ON "notifications" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")
    `);

    // 2. Criar tabela de itens do carrinho sincronizados
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "size" varchar NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "custom_name" varchar,
        "custom_number" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cart_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cart_items_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cart_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    // Índices para itens do carrinho
    await queryRunner.query(`
      CREATE INDEX "IDX_cart_items_user" ON "cart_items" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_cart_items_user"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_is_read"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_user"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
