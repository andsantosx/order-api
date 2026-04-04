import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { log } from '../../config/logger';

export class SocketService {
  private static instance: SocketService;
  private io: SocketServer | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*', // Ajustar conforme necessário em produção
        methods: ['GET', 'POST'],
      },
    });

    log.info('🔌 Socket.io initialized');

    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      if (userId) {
        socket.join(`user:${userId}`);
        log.info(`👤 User connected to socket: ${userId}`);
      }

      socket.on('disconnect', () => {
        log.info('🔌 Socket disconnected');
      });
    });
  }

  public getIO(): SocketServer {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }
    return this.io;
  }

  /**
   * Emite um evento para um usuário específico
   */
  public emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
      log.info(`📤 Event ${event} emitted to user ${userId}`);
    }
  }
}
