import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script de emergência para corrigir valores nulos em colunas obrigatórias.
 * Isso permite que o TypeORM synchronize consiga aplicar as constraints de NOT NULL.
 */
async function fixDatabaseNulls() {
  console.log('🔍 Iniciando correção de valores nulos no banco de dados...');

  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false, // Importante: não sincronizar durante a correção
    logging: true,
  });

  try {
    await AppDataSource.initialize();
    console.log('✅ Conectado ao banco de dados.');

    // 1. Corrigir ShippingAddress.street
    console.log('🛠 Corrigindo campos nulos em shipping_addresses...');
    const result = await AppDataSource.query(`
      UPDATE shipping_addresses 
      SET street = 'Campo não preenchido' 
      WHERE street IS NULL;
    `);
    console.log(`✅ Resultado: ${JSON.stringify(result)}`);

    // 2. Corrigir outros campos críticos se houver (por precaução)
    await AppDataSource.query(`
      UPDATE shipping_addresses SET city = 'Não informado' WHERE city IS NULL;
      UPDATE shipping_addresses SET state = '??' WHERE state IS NULL;
      UPDATE shipping_addresses SET zip_code = '00000-000' WHERE zip_code IS NULL;
    `);

    console.log('✨ Correção finalizada com sucesso. Agora o servidor deve iniciar normalmente.');
  } catch (error: any) {
    console.error('❌ Erro durante a correção:', error.message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

fixDatabaseNulls().catch(console.error);
