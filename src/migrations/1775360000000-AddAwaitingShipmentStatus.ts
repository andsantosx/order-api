import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAwaitingShipmentStatus1775360000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona status AWAITING_SHIPMENT (padrão mercado BR: pedido pago aguardando envio)
    await queryRunner.query(`
      INSERT INTO "status" (id, name, label, type)
      VALUES (8, 'AWAITING_SHIPMENT', 'Aguardando Envio', 'ORDER')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "status" WHERE id = 8`);
  }
}
