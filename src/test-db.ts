import { AppDataSource } from './data-source';

async function testConnection() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');

    // Testa uma query simples
    const result = await AppDataSource.query('SELECT NOW()');
    console.log('🕒 Hora atual do banco de dados:', result[0].now);

  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão com o banco de dados fechada.');
    }
  }
}

testConnection();
