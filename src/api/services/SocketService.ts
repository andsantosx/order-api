import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { log } from '../../config/logger';
import { OrderService } from './OrderService';
import { ORDER_STATUS_DESCRIPTIONS } from '../../constants';

export interface CustomSocket extends Socket {
  userId?: string;
  isAdmin?: boolean;
}

/**
 * SocketService
 *
 * Singleton responsável por gerenciar conexões WebSocket.
 * Suporta notificações por usuário e por sala de admins.
 */
export class SocketService {
  private static instance: SocketService;
  private io: SocketServer | null = null;

  private constructor() { }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: [process.env.FRONTEND_URL || '*', "https://ordersc.com.br", "http://localhost:3000", "http://localhost:3001"],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true
    });

    log.info('🔌 Socket.io initialized');

    this.io.on('connection', (socket: CustomSocket) => {
      const { userId, isAdmin } = socket;

      if (userId) {
        // Sala do usuário: recebe eventos específicos do seu pedido
        socket.join(`user:${userId}`);
        log.info(`👤 User connected to socket: ${userId}`);
      }

      if (isAdmin) {
        // Sala de admins: recebe eventos de novos pedidos e alertas
        socket.join('admins');
        log.info(`👑 Admin connected to socket: ${userId}`);
      }

      // Permite que qualquer conexão entre na sala de um pedido específico (para Guests)
      socket.on('join_order', (orderId: string) => {
        if (orderId) {
          socket.join(`order:${orderId}`);
          log.info(`📦 Socket joined order room: order:${orderId}`);
        }
      });

      // Sincroniza o status de um pedido sob demanda (ex: ao voltar pra aba)
      socket.on('sync_order', async (orderId: string) => {
        if (!orderId) return;

        try {
          const orderService = new OrderService();
          // Busca o pedido sem restrição de userId aqui, pois o socket já entrou na sala se for dele
          // ou o frontend está validando a posse. O getOne lançará erro se não encontrar.
          const order = await orderService.getOne(orderId, undefined, true);
          
          socket.emit('ORDER_STATUS_UPDATE', {
            orderId: order.id,
            statusId: order.statusId,
            message: order.status?.label || ORDER_STATUS_DESCRIPTIONS['PENDING'], // fallback seguro
            trackingCode: order.trackingCode,
            trackingUrl: order.trackingUrl,
            sync: true // Flag para o frontend saber que é um sync
          });

          log.info(`🔄 Order status synced via socket: ${orderId}`);
        } catch (error) {
          log.error(`❌ Error syncing order via socket: ${orderId}`, { error });
        }
      });

      socket.on('disconnect', () => {
        log.info('🔌 Socket disconnected', { userId });
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
   * Emite um evento para um usuário específico (sala user:<userId>)
   */
  public emitToUser(userId: string, event: string, data: unknown): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
      log.info(`📤 Event "${event}" emitted to user ${userId}`);
    }
  }

  /**
   * Emite um evento para todos os admins conectados
   */
  public emitToAdmins(event: string, data: unknown): void {
    if (this.io) {
      this.io.to('admins').emit(event, data);
      log.info(`📢 Event "${event}" emitted to admins room`);
    }
  }

  /**
   * Emite um evento para a sala de um pedido específico (order:orderId)
   */
  public emitToOrder(orderId: string, event: string, data: unknown): void {
    if (this.io) {
      this.io.to(`order:${orderId}`).emit(event, data);
      log.info(`📦 Event "${event}" emitted to order room ${orderId}`);
    }
  }

  /**
   * Emite um evento para todos os usuários conectados (broadcast)
   */
  public broadcast(event: string, data: unknown): void {
    if (this.io) {
      this.io.emit(event, data);
      log.info(`📡 Event "${event}" broadcast to all`);
    }
  }
}
