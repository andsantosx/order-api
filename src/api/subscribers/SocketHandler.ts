import { domainEvents } from '../domain/events/DomainEvents';
import { SocketService } from '../services/SocketService';
import { log } from '../../config/logger';

/**
 * SocketHandler
 * 
 * Este handler atua como um Adaptador na Clean Architecture, 
 * ligando eventos de domínio a notificações de infraestrutura (WebSockets).
 * 
 * O PaymentService libera um evento, e este handler garante que
 * o usuário final seja notificado em tempo real.
 */
export class SocketHandler {
  private static isInitialized = false;

  public static init(): void {
    if (this.isInitialized) return;

    log.info('🔌 SocketHandler (Internal Subscriber) initializing...');

    const socketService = SocketService.getInstance();

    // Ouvinte para pagamentos aprovados
    domainEvents.subscribe('PAYMENT_APPROVED', (data: { userId: string; orderId: string; status: string }) => {
      log.info(`[SocketHandler] Notifying user ${data.userId} about payment for order ${data.orderId}`);
      
      socketService.emitToUser(data.userId, 'PAYMENT_APPROVED', {
        orderId: data.orderId,
        status: data.status,
      });
    });

    this.isInitialized = true;
  }
}
