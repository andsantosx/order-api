import app from './app';
import { AppDataSource } from './data-source';
import { env } from './config/env';
import { log } from './config/logger';

const PORT = env.PORT || 3000;

// Inicialização do Servidor
// Primeiro conecta ao banco de dados, depois inicia o servidor HTTP
AppDataSource.initialize()
  .then(async () => {
    log.info('Conexão com o banco de dados estabelecida com sucesso');
    app.listen(PORT, () => {
      log.info(`Server running on port ${PORT}`);
      log.info(`Environment: ${env.NODE_ENV}`);
      log.info(`Swagger: http://localhost:${PORT}/api-docs`);
      log.info(`Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    log.error('Erro ao inicializar o servidor', { error: error.message });
    process.exit(1);
  });
