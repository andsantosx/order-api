import { domainEvents } from '../domain/events/DomainEvents';
import { OrderDomainEvent } from '../../types/domain-enums';
import { EmailService } from '../services/EmailService';
import { OrderService } from '../services/OrderService';
import winston from 'winston';

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
    domainEvents.on(OrderDomainEvent.ORDER_CREATED, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderConfirmation(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          order.totalAmount,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (ORDER_CREATED): ${error.message}`);
      }
    });

    // 2. Pagamento Pendente / Em Processamento (Gateway)
    domainEvents.on(OrderDomainEvent.PAYMENT_PENDING, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendPaymentPending(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (PAYMENT_PENDING): ${error.message}`);
      }
    });

    // 3. Pagamento Aprovado
    domainEvents.on(OrderDomainEvent.PAYMENT_APPROVED, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendPaymentApproved(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (PAYMENT_APPROVED): ${error.message}`);
      }
    });

    // 4. Pagamento Rejeitado
    domainEvents.on(OrderDomainEvent.PAYMENT_REJECTED, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendPaymentRejected(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.friendlyReason || data.reason,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (PAYMENT_REJECTED): ${error.message}`);
      }
    });

    // 5. Pedido Enviado (Com código de rastreio)
    domainEvents.on(OrderDomainEvent.ORDER_SHIPPED, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderShipped(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.trackingCode || order.trackingCode || 'N/A',
          data.trackingUrl || order.trackingUrl,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (ORDER_SHIPPED): ${error.message}`);
      }
    });

    // 6. Pedido Entregue
    domainEvents.on(OrderDomainEvent.ORDER_DELIVERED, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderDelivered(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (ORDER_DELIVERED): ${error.message}`);
      }
    });

    // 7. Pedido Cancelado
    domainEvents.on(OrderDomainEvent.ORDER_CANCELLED, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderCancelled(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (ORDER_CANCELLED): ${error.message}`);
      }
    });

    // 8. Pedido Reembolsado
    domainEvents.on(OrderDomainEvent.ORDER_REFUNDED, async (data: any) => {
      try {
        const order = await this.orderService.getOne(data.orderId, undefined, true);
        await this.emailService.sendOrderRefunded(
          order.user?.email || '',
          order.user?.name || 'Cliente',
          order.id,
          data.notes,
          order.items
        );
      } catch (error: any) {
        winston.error(`EmailHandler Error (ORDER_REFUNDED): ${error.message}`);
      }
    });

    winston.info('📧 EmailHandler: Automação completa de e-mails transacionais ativada.');
  }
}
