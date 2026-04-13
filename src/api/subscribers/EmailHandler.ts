import { domainEvents } from '../domain/events/DomainEvents';
import { OrderDomainEvent } from '../../types/domain-enums';
import { EmailService } from '../services/EmailService';
import { OrderService } from '../services/OrderService';
import winston from 'winston';
import {
  OrderEventPayload,
  PaymentRejectedEventPayload,
  OrderShippedEventPayload,
  UserGuestCreatedEventPayload,
} from '../../types/events';

/**
 * Subscriber responsável por escutar eventos de domínio e disparar e-mails.
 * Implementa a automação completa do fluxo de notificações transacionais.
 */
export class EmailHandler {
  private static emailService: EmailService;
  private static orderService: OrderService;

  static init() {
    this.emailService = new EmailService();
    this.orderService = new OrderService();

    // 1. Pedido Criado (Boas-vindas e Confirmação Inicial)
    domainEvents.on(
      OrderDomainEvent.ORDER_CREATED,
      async (data: OrderEventPayload & { isAccountLinked?: boolean }) => {
        try {
          const order = await this.orderService.getOne(data.orderId, undefined, true);
          await this.emailService.sendOrderConfirmation(
            order.user?.email || '',
            order.user?.name || 'Cliente',
            order.id,
            order.totalAmount,
            data.notes,
            order.items,
            data.isAccountLinked,
          );
        } catch (error: unknown) {
          winston.error(
            `EmailHandler Error (ORDER_CREATED): ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    );

    // 2. Pagamento Pendente / Em Processamento (Gateway)
    domainEvents.on(OrderDomainEvent.PAYMENT_PENDING, async (data: OrderEventPayload) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendPaymentPending(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items,
        );
      } catch (error: unknown) {
        winston.error(
          `EmailHandler Error (PAYMENT_PENDING): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });

    // 3. Pagamento Aprovado
    domainEvents.on(OrderDomainEvent.PAYMENT_APPROVED, async (data: OrderEventPayload) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);

        // E-mail para o Cliente
        await this.emailService.sendPaymentApproved(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items,
        );

        // Notificação Interna para Administração (Controle de Estoque/Logística)
        await this.emailService.sendInternalOrderNotification(order);
      } catch (error: unknown) {
        winston.error(
          `EmailHandler Error (PAYMENT_APPROVED): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });

    // 4. Pagamento Rejeitado
    domainEvents.on(
      OrderDomainEvent.PAYMENT_REJECTED,
      async (data: PaymentRejectedEventPayload) => {
        try {
          const order = await this.orderService.getOne(data.orderId, undefined, true);
          await this.emailService.sendPaymentRejected(
            order.user?.email || '',
            order.user?.name || 'Cliente',
            order.id,
            data.friendlyReason || data.reason,
            data.notes,
            order.items,
          );
        } catch (error: unknown) {
          winston.error(
            `EmailHandler Error (PAYMENT_REJECTED): ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    );

    // 5. Pedido Enviado (Com código de rastreio)
    domainEvents.on(OrderDomainEvent.ORDER_SHIPPED, async (data: OrderShippedEventPayload) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderShipped(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.trackingCode || order.trackingCode || 'N/A',
          data.trackingUrl || order.trackingUrl,
          data.notes,
          order.items,
        );
      } catch (error: unknown) {
        winston.error(
          `EmailHandler Error (ORDER_SHIPPED): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });

    // 6. Pedido Entregue
    domainEvents.on(OrderDomainEvent.ORDER_DELIVERED, async (data: OrderEventPayload) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderDelivered(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items,
        );
      } catch (error: unknown) {
        winston.error(
          `EmailHandler Error (ORDER_DELIVERED): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });

    // 7. Pedido Cancelado
    domainEvents.on(OrderDomainEvent.ORDER_CANCELLED, async (data: OrderEventPayload) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderCancelled(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items,
        );
      } catch (error: unknown) {
        winston.error(
          `EmailHandler Error (ORDER_CANCELLED): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });

    // 8. Pedido Reembolsado
    domainEvents.on(OrderDomainEvent.ORDER_REFUNDED, async (data: OrderEventPayload) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderRefunded(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items,
        );
      } catch (error: unknown) {
        winston.error(
          `EmailHandler Error (ORDER_REFUNDED): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });

    // 9. Criação de Conta Automática (Guest Checkout)
    domainEvents.on(
      OrderDomainEvent.USER_GUEST_CREATED,
      async (data: UserGuestCreatedEventPayload) => {
        try {
          await this.emailService.sendGuestWelcomeEmail(data.email, data.name, data.password);
        } catch (error: unknown) {
          winston.error(
            `EmailHandler Error (USER_GUEST_CREATED): ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    );

    winston.info('📧 EmailHandler: Automação completa de e-mails transacionais ativada.');
  }
}
