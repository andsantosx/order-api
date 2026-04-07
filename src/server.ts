import app from './app';
import { AppDataSource } from './data-source';
import { env } from './config/env';
import { log } from './config/logger';
import { SocketService } from './api/services/SocketService';
import { socketAuthMiddleware } from './api/middlewares/socketAuthMiddleware';
import { SocketHandler } from './api/subscribers/SocketHandler';
import { OrderExpirationJob } from './api/jobs/OrderExpirationJob';

const PORT = env.PORT || 3000;

// ... (Tratamento Global de Erros Críticos remains the same)

// Inicialização do Servidor
AppDataSource.initialize()
  .then(async () => {
    log.info('Conexão com o banco de dados estabelecida com sucesso');

    const server = app.listen(PORT, () => {
      log.info(`Server running on port ${PORT}`);
      log.info(`Environment: ${env.NODE_ENV}`);
      log.info(`Swagger: http://localhost:${PORT}/api-docs`);
      log.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Inicializa o Socket.io e os Handlers de Evento
    const socketService = SocketService.getInstance();
    socketService.init(server);
    SocketHandler.init();
    OrderExpirationJob.init();

    // Aplica o middleware de autenticação no socket
    socketService.getIO().use(socketAuthMiddleware);

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
