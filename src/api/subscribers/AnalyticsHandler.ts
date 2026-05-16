import { domainEvents } from '../domain/events/DomainEvents';
import { OrderDomainEvent } from '../../types/domain-enums';
import { GoogleAnalyticsService } from '../services/GoogleAnalyticsService';
import { OrderService } from '../services/OrderService';
import { OrderStatus } from '../entities/Order';
import { log } from '../../config/logger';
import { OrderEventPayload } from '../../types/events';
import { container } from 'tsyringe';

/**
 * Subscriber responsável por escutar eventos de domínio e disparar eventos para o GA4.
 * Foca principalmente em eventos que garantem a medição de conversões e ROI.
 */
export class AnalyticsHandler {
  private static gaService: GoogleAnalyticsService;
  private static orderService: OrderService;

  static init() {
    this.gaService = container.resolve(GoogleAnalyticsService);
    this.orderService = container.resolve(OrderService);

    // 1. Pagamento Aprovado (A conversão real)
    domainEvents.on(OrderDomainEvent.PAYMENT_APPROVED, async (data: OrderEventPayload) => {
      try {
        // Evita duplicidade se o status anterior já era PAID (redundância de webhooks)
        if (data.previousStatusId === OrderStatus.PAID) {
          return;
        }

        const order = await this.orderService.getOne(data.orderId, undefined, true);

        log.info('[AnalyticsHandler] Disparando evento purchase para o GA4', { orderId: order.id });
        await this.gaService.trackPurchase(order);
      } catch (error: unknown) {
        log.error(
          `AnalyticsHandler Error (PAYMENT_APPROVED): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });

    // 2. Pedido Criado (Opcional: Pode ser usado para trackear início de checkout off-line)
    // domainEvents.on(OrderDomainEvent.ORDER_CREATED, async (data: OrderEventPayload) => { ... });

    log.info('📊 AnalyticsHandler: Medição do lado do servidor (Measurement Protocol) ativada.');
  }
}
