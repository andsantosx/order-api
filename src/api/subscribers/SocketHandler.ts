import { domainEvents } from '../domain/events/DomainEvents';
import { SocketService } from '../services/SocketService';
import { log } from '../../config/logger';

interface PaymentApprovedEventData {
  userId: string;
  orderId: string;
  status: string;
}

/**
 * SocketHandler
 */
export class SocketHandler {
  private static isInitialized = false;

  public static init(): void {
    if (this.isInitialized) return;

    log.info('🔌 SocketHandler (Internal Subscriber) initializing...');

    const socketService = SocketService.getInstance();

    // Ouvinte para pagamentos aprovados
    domainEvents.subscribe(
      'PAYMENT_APPROVED',
      (data: unknown) => {
        const eventData = data as PaymentApprovedEventData;
        log.info(
          `[SocketHandler] Notifying user ${eventData.userId} about payment for order ${eventData.orderId}`,
        );

        socketService.emitToUser(eventData.userId, 'PAYMENT_APPROVED', {
          orderId: eventData.orderId,
          status: eventData.status,
        });
      },
    );

    this.isInitialized = true;
  }
}
