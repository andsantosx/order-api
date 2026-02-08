import app from './app';
import { AppDataSource } from './data-source';
import { env } from './config/env';
import { log } from './config/logger';

const PORT = env.PORT || 3000;

// ==========================================
// Tratamento Global de Erros Críticos
// ==========================================

// Captura exceções não tratadas (bugs síncronos)
// Deve ser registrado antes de qualquer outro código que possa falhar
process.on('uncaughtException', (error) => {
  log.error('❌ Uncaught Exception thrown', { error });
  // Em caso de uncaughtException, é recomendado reiniciar o processo
  // pois o estado da aplicação pode estar inconsistente
  process.exit(1);
});

// Captura promessas rejeitadas sem catch (bugs assíncronos)
process.on('unhandledRejection', (reason) => {
  log.error('❌ Unhandled Rejection at Promise', { reason });
  process.exit(1);
});

// Inicialização do Servidor
// Primeiro conecta ao banco de dados, depois inicia o servidor HTTP
AppDataSource.initialize()
  .then(async () => {
    log.info('Conexão com o banco de dados estabelecida com sucesso');
    const server = app.listen(PORT, () => {
      log.info(`Server running on port ${PORT}`);
      log.info(`Environment: ${env.NODE_ENV}`);
      log.info(`Swagger: http://localhost:${PORT}/api-docs`);
      log.info(`Health check: http://localhost:${PORT}/health`);
    });

    const gracefulShutdown = (signal: string) => {
      log.info(`${signal} signal received: closing HTTP server`);
      server.close(() => {
        log.info('HTTP server closed');
        AppDataSource.destroy()
          .then(() => {
            log.info('Database connection closed');
            process.exit(0);
          })
          .catch((err) => {
            log.error('Error closing database connection', { error: err });
            process.exit(1);
          });
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((error) => {
    log.error('Erro ao inicializar o servidor', { error: error.message });
    process.exit(1);
  });
