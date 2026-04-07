import { domainEvents } from '../domain/events/DomainEvents';
import { SocketService } from '../services/SocketService';
import { log } from '../../config/logger';
import { ORDER_STATUS_DESCRIPTIONS } from '../../constants';
import { OrderDomainEvent } from '../../types/domain-enums';

/**
 * Payload base de eventos de status de pedido
 */
interface OrderStatusEventData {
  orderId: string;
  userId?: string;
  newStatusId: number;
  previousStatusId?: number;
  trackingCode?: string;
  trackingUrl?: string;
  changedById?: string;
}

interface PaymentRejectedEventData {
  orderId: string;
  userId?: string;
  statusDetail?: string;
  friendlyReason?: string;
}

interface OrderCreatedEventData {
  orderId: string;
  userId?: string;
  totalAmount?: number;
}

/**
 * SocketHandler
 *
 * Subscriber do barramento de eventos de domínio.
 * Traduz eventos do domínio em notificações WebSocket para usuários e admins.
 *
 * Princípio: o domínio não conhece quem está ouvindo.
 * O SocketHandler faz a ponte entre domínio e infraestrutura de notificação.
 */
export class SocketHandler {
  private static isInitialized = false;

  public static init(): void {
    if (this.isInitialized) return;

    log.info('🔌 SocketHandler initializing all domain event subscribers...');

    const socketService = SocketService.getInstance();

    // novo pedido criado → notifica admin
    domainEvents.subscribe(OrderDomainEvent.ORDER_CREATED, (data: unknown) => {
      const event = data as OrderCreatedEventData;
      log.info(`[SocketHandler] ORDER_CREATED: ${event.orderId}`);

      socketService.emitToAdmins('ORDER_CREATED', {
        orderId: event.orderId,
        message: 'Novo pedido recebido!',
        totalAmount: event.totalAmount,
      });

      if (event.userId) {
        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 1,
          message: ORDER_STATUS_DESCRIPTIONS['PENDING'],
        });
      }

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 1,
        message: ORDER_STATUS_DESCRIPTIONS['PENDING'],
      });
    });

    // pagamento em análise
    domainEvents.subscribe(OrderDomainEvent.PAYMENT_PENDING, (data: unknown) => {
      const event = data as OrderStatusEventData;
      log.info(`[SocketHandler] PAYMENT_PENDING: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 2,
          message: ORDER_STATUS_DESCRIPTIONS['PROCESSING'],
        });
      }

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 2,
        message: ORDER_STATUS_DESCRIPTIONS['PROCESSING'],
      });
    });

    // pagamento aprovado
    domainEvents.subscribe(OrderDomainEvent.PAYMENT_APPROVED, (data: unknown) => {
      const event = data as OrderStatusEventData;
      log.info(`[SocketHandler] PAYMENT_APPROVED: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'PAYMENT_APPROVED', {
          orderId: event.orderId,
          statusId: 3,
          message: ORDER_STATUS_DESCRIPTIONS['PAID'],
        });

        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 3,
          message: ORDER_STATUS_DESCRIPTIONS['PAID'],
        });
      }

      socketService.emitToOrder(event.orderId, 'order_paid', {
        orderId: event.orderId,
        statusId: 3,
        message: ORDER_STATUS_DESCRIPTIONS['PAID'],
      });

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 3,
        message: ORDER_STATUS_DESCRIPTIONS['PAID'],
      });

      // Notifica admin sobre pagamento confirmado
      socketService.emitToAdmins('PAYMENT_APPROVED', {
        orderId: event.orderId,
        message: 'Pagamento confirmado em um pedido!',
      });
    });

    // pagamento rejeitado
    domainEvents.subscribe(OrderDomainEvent.PAYMENT_REJECTED, (data: unknown) => {
      const event = data as PaymentRejectedEventData;
      log.info(`[SocketHandler] PAYMENT_REJECTED: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'PAYMENT_REJECTED', {
          orderId: event.orderId,
          message: event.friendlyReason || ORDER_STATUS_DESCRIPTIONS['CANCELLED'],
          statusDetail: event.statusDetail,
        });
      }

      socketService.emitToOrder(event.orderId, 'payment_rejected', {
        orderId: event.orderId,
        message: event.friendlyReason || ORDER_STATUS_DESCRIPTIONS['CANCELLED'],
        friendlyReason: event.friendlyReason,
        statusDetail: event.statusDetail,
      });
    });

    // pedido aguardando envio
    domainEvents.subscribe(OrderDomainEvent.ORDER_AWAITING_SHIPMENT, (data: unknown) => {
      const event = data as OrderStatusEventData;
      log.info(`[SocketHandler] ORDER_AWAITING_SHIPMENT: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 8,
          message: ORDER_STATUS_DESCRIPTIONS['AWAITING_SHIPMENT'],
        });
      }

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 8,
        message: ORDER_STATUS_DESCRIPTIONS['AWAITING_SHIPMENT'],
      });
    });

    // pedido enviado
    domainEvents.subscribe(OrderDomainEvent.ORDER_SHIPPED, (data: unknown) => {
      const event = data as OrderStatusEventData;
      log.info(`[SocketHandler] ORDER_SHIPPED: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'ORDER_SHIPPED', {
          orderId: event.orderId,
          statusId: 4,
          message: ORDER_STATUS_DESCRIPTIONS['SHIPPED'],
          trackingCode: event.trackingCode,
          trackingUrl: event.trackingUrl,
        });

        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 4,
          message: ORDER_STATUS_DESCRIPTIONS['SHIPPED'],
          trackingCode: event.trackingCode,
          trackingUrl: event.trackingUrl,
        });
      }

      socketService.emitToOrder(event.orderId, 'ORDER_SHIPPED', {
        orderId: event.orderId,
        statusId: 4,
        message: ORDER_STATUS_DESCRIPTIONS['SHIPPED'],
        trackingCode: event.trackingCode,
        trackingUrl: event.trackingUrl,
      });

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 4,
        message: ORDER_STATUS_DESCRIPTIONS['SHIPPED'],
        trackingCode: event.trackingCode,
        trackingUrl: event.trackingUrl,
      });
    });

    // pedido entregue
    domainEvents.subscribe(OrderDomainEvent.ORDER_DELIVERED, (data: unknown) => {
      const event = data as OrderStatusEventData;
      log.info(`[SocketHandler] ORDER_DELIVERED: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'ORDER_DELIVERED', {
          orderId: event.orderId,
          statusId: 5,
          message: ORDER_STATUS_DESCRIPTIONS['DELIVERED'],
        });

        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 5,
          message: ORDER_STATUS_DESCRIPTIONS['DELIVERED'],
        });
      }

      socketService.emitToOrder(event.orderId, 'ORDER_DELIVERED', {
        orderId: event.orderId,
        statusId: 5,
        message: ORDER_STATUS_DESCRIPTIONS['DELIVERED'],
      });

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 5,
        message: ORDER_STATUS_DESCRIPTIONS['DELIVERED'],
      });
    });

    // pedido cancelado
    domainEvents.subscribe(OrderDomainEvent.ORDER_CANCELLED, (data: unknown) => {
      const event = data as OrderStatusEventData & { cancelledById?: string };
      log.info(`[SocketHandler] ORDER_CANCELLED: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 6,
          message: ORDER_STATUS_DESCRIPTIONS['CANCELLED'],
        });
      }

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 6,
        message: ORDER_STATUS_DESCRIPTIONS['CANCELLED'],
      });

      socketService.emitToAdmins('ORDER_CANCELLED', {
        orderId: event.orderId,
        cancelledById: event.cancelledById,
        message: 'Um pedido foi cancelado.',
      });
    });

    // pedido reembolsado
    domainEvents.subscribe(OrderDomainEvent.ORDER_REFUNDED, (data: unknown) => {
      const event = data as OrderStatusEventData;
      log.info(`[SocketHandler] ORDER_REFUNDED: ${event.orderId}`);

      if (event.userId) {
        socketService.emitToUser(event.userId, 'ORDER_STATUS_UPDATE', {
          orderId: event.orderId,
          statusId: 7,
          message: ORDER_STATUS_DESCRIPTIONS['REFUNDED'],
        });
      }

      socketService.emitToOrder(event.orderId, 'ORDER_STATUS_UPDATE', {
        orderId: event.orderId,
        statusId: 7,
        message: ORDER_STATUS_DESCRIPTIONS['REFUNDED'],
      });
    });

    this.isInitialized = true;
    log.info('✅ SocketHandler: all domain event subscribers registered.');
  }
}
