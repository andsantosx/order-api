import { AppDataSource } from './data-source';
import { log } from './config/logger';

async function testConnection() {
  try {
    await AppDataSource.initialize();
    log.info('✅ Conexão com o banco de dados estabelecida com sucesso!');

    // Testa uma query simples
    const result = await AppDataSource.query('SELECT NOW()');
    log.info(`🕒 Hora atual do banco de dados: ${result[0].now}`);
  } catch (error) {
    log.error('❌ Erro ao conectar com o banco de dados:', { error });
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      log.info('🔌 Conexão com o banco de dados fechada.');
    }
  }
}

testConnection();
