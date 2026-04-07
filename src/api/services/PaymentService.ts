import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import { log } from '../../config/logger';
import { MercadoPagoPaymentResponse } from '../../types/payment';
import {
  MercadoPagoPaymentStatus,
  MercadoPagoStatusDetail,
  OrderDomainEvent,
  ChangedByRole,
} from '../../types/domain-enums';
import { OrderService } from './OrderService';
import { Order, OrderStatus, ORDER_STATUS_EVENTS } from '../entities/Order';
import { PaymentMapper } from '../mappers/PaymentMapper';
import {
  PaymentProcessingException,
  PaymentRejectedException,
} from '../exceptions/PaymentException';
import { AppDataSource } from '../../data-source';
import { client } from '../../config/mercadopago';
import { Payment, PaymentRefund } from 'mercadopago';
import { domainEvents } from '../domain/events/DomainEvents';
import { OrderHistoryService } from './OrderHistoryService';

const paymentClient = new Payment(client);
const refundClient  = new PaymentRefund(client);

/**
 * Mapeamento tipado: status do Mercado Pago → status interno do pedido.
 *
 * Regras de negócio:
 * - approved    → PAID (pagamento confirmado)
 * - pending     → PROCESSING (aguardando confirmação, ex: PIX gerado)
 * - in_process  → PROCESSING (em análise de risco/antifraude)
 * - authorized  → PROCESSING (pré-autorizado, ainda não capturado)
 * - rejected    → CANCELLED (recusado, sem retenção de valores)
 * - cancelled   → CANCELLED (cancelado antes da liquidação)
 * - refunded    → REFUNDED (reembolso confirmado)
 * - charged_back → REFUNDED (chargeback — reembolso forçado pelo banco)
 */
const MP_TO_ORDER_STATUS: Record<MercadoPagoPaymentStatus, OrderStatus> = {
  [MercadoPagoPaymentStatus.APPROVED]:    OrderStatus.PAID,
  [MercadoPagoPaymentStatus.PENDING]:     OrderStatus.PROCESSING,
  [MercadoPagoPaymentStatus.AUTHORIZED]:  OrderStatus.PROCESSING,
  [MercadoPagoPaymentStatus.IN_PROCESS]:  OrderStatus.PROCESSING,
  [MercadoPagoPaymentStatus.IN_MEDIATION]: OrderStatus.PROCESSING,
  [MercadoPagoPaymentStatus.REJECTED]:    OrderStatus.CANCELLED,
  [MercadoPagoPaymentStatus.CANCELLED]:   OrderStatus.CANCELLED,
  [MercadoPagoPaymentStatus.REFUNDED]:    OrderStatus.REFUNDED,
  [MercadoPagoPaymentStatus.CHARGED_BACK]: OrderStatus.REFUNDED,
};

/**
 * Mensagens amigáveis por status_detail do Mercado Pago.
 * Exibidas diretamente ao usuário em caso de rejeição.
 */
const STATUS_DETAIL_MESSAGES: Partial<Record<MercadoPagoStatusDetail, string>> = {
  [MercadoPagoStatusDetail.CC_REJECTED_INSUFFICIENT_AMOUNT]:      'Saldo insuficiente no cartão.',
  [MercadoPagoStatusDetail.CC_REJECTED_HIGH_RISK]:                'Transação recusada por segurança.',
  [MercadoPagoStatusDetail.CC_REJECTED_BAD_FILLED_CARD_NUMBER]:   'Número de cartão inválido.',
  [MercadoPagoStatusDetail.CC_REJECTED_BAD_FILLED_DATE]:          'Data de validade inválida.',
  [MercadoPagoStatusDetail.CC_REJECTED_BAD_FILLED_SECURITY_CODE]: 'Código de segurança inválido.',
  [MercadoPagoStatusDetail.CC_REJECTED_BLACKLIST]:                'Cartão não autorizado.',
  [MercadoPagoStatusDetail.CC_REJECTED_CALL_FOR_AUTHORIZE]:       'Ligue para o banco para autorizar a transação.',
  [MercadoPagoStatusDetail.PENDING_CONTINGENCY]:                  'Pagamento em análise, aguarde a confirmação.',
  [MercadoPagoStatusDetail.PENDING_REVIEW_MANUAL]:                'Pagamento em análise manual pelo Mercado Pago.',
};

export class PaymentService {
  private orderService: OrderService;
  private orderRepository = AppDataSource.getRepository(Order);

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Processa o pagamento via Mercado Pago (Checkout Transparente).
   *
   * Fluxo:
   * 1. Valida e busca o pedido
   * 2. Constrói o payload para o MP
   * 3. Envia o pagamento
   * 4. Sincroniza o status do pedido
   * 5. Retorna resposta normalizada para o frontend
   */
  public async processPayment(data: any): Promise<any> {
    const orderId = data.orderId || data.externalReference || data.metadata?.orderId;

    if (!orderId) {
      throw new PaymentProcessingException(
        'Identificador do pedido (orderId) ausente na requisição',
      );
    }

    try {
      const order = await this.orderService.getOne(orderId as string, undefined, true);

      const mpBody        = PaymentMapper.toMercadoPago(order, data);
      const idempotencyKey = `order_${order.id}_${Date.now()}`;

      const response = await paymentClient.create({
        body: mpBody,
        requestOptions: { idempotencyKey },
      });

      const result = response as unknown as MercadoPagoPaymentResponse;

      await this.syncOrderWithPaymentResult(order, result);

      return PaymentMapper.toFrontendResponse(result);
    } catch (error: any) {
      this.handlePaymentError(error, orderId as string);
    }
  }

  /**
   * Sincroniza o status do pedido com o resultado do Mercado Pago.
   * Respeita a máquina de estados, registra histórico e dispara eventos de domínio.
   */
  private async syncOrderWithPaymentResult(
    order: Order,
    result: MercadoPagoPaymentResponse,
  ): Promise<void> {
    const mpStatus  = result.status as MercadoPagoPaymentStatus;
    const newStatus = MP_TO_ORDER_STATUS[mpStatus] ?? OrderStatus.PROCESSING;

    // Máquina de estados: não regredir status já confirmado
    if (!order.canTransitionTo(newStatus)) {
      log.warn('[PaymentService] Transition blocked by state machine', {
        orderId:        order.id,
        currentStatus:  order.statusId,
        attemptedStatus: newStatus,
        mpStatus,
      });
      return;
    }

    const previousStatusId = order.statusId;

    const updatePayload: Partial<Order> = {
      statusId:      newStatus,
      paymentId:     result.id?.toString(),
      paymentMethod: result.payment_method_id,
      installments:  result.installments || 1,
    };

    if (newStatus === OrderStatus.CANCELLED) {
      updatePayload.cancelledAt = new Date();
    }

    await this.orderRepository.update(order.id, updatePayload);

    // Registrar no histórico (fire-and-forget)
    OrderHistoryService.record({
      order:         { ...order, statusId: previousStatusId } as Order,
      toStatusId:    newStatus,
      changedByRole: ChangedByRole.PAYMENT_GATEWAY,
      notes:         `Mercado Pago: status=${result.status}, detail=${result.status_detail ?? 'n/a'}`,
    });

    // Disparar evento de domínio correspondente
    const domainEvent = ORDER_STATUS_EVENTS[newStatus];
    if (domainEvent) {
      domainEvents.dispatch(domainEvent, {
        orderId:          order.id,
        userId:           order.user?.id,
        newStatusId:      newStatus,
        previousStatusId,
        mpStatus:         result.status,
        mpStatusDetail:   result.status_detail,
        paymentMethod:    result.payment_method_id,
      });
    }

    // Pagamento rejeitado: dispara evento extra com motivo amigável para o usuário
    if (mpStatus === MercadoPagoPaymentStatus.REJECTED) {
      domainEvents.dispatch(OrderDomainEvent.PAYMENT_REJECTED, {
        orderId:        order.id,
        userId:         order.user?.id,
        statusDetail:   result.status_detail,
        friendlyReason: this.getFriendlyMessage(result.status_detail as MercadoPagoStatusDetail),
      });
    }

    log.info('[PaymentService] Order status synced', {
      orderId: order.id,
      from:    previousStatusId,
      to:      newStatus,
      mpStatus,
    });
  }

  /**
   * Reembolsa um pedido pago (somente admin).
   */
  public async refundPayment(orderId: string): Promise<any> {
    const order = await this.orderService.getOne(orderId, undefined, true);

    if (!order?.paymentId) {
      throw new PaymentProcessingException('Pedido não encontrado ou sem ID de pagamento');
    }

    if (!order.canTransitionTo(OrderStatus.REFUNDED)) {
      throw new AppError(
        `Não é possível reembolsar um pedido no status "${order.status?.label ?? order.statusId}".`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    try {
      const refund           = await refundClient.create({ payment_id: Number(order.paymentId) });
      const previousStatusId = order.statusId;

      await this.orderRepository.update(order.id, { statusId: OrderStatus.REFUNDED });

      OrderHistoryService.record({
        order:         { ...order, statusId: previousStatusId } as Order,
        toStatusId:    OrderStatus.REFUNDED,
        changedByRole: ChangedByRole.SYSTEM,
        notes:         'Reembolso processado via Mercado Pago',
      });

      domainEvents.dispatch(OrderDomainEvent.ORDER_REFUNDED, {
        orderId:          order.id,
        userId:           order.user?.id,
        newStatusId:      OrderStatus.REFUNDED,
        previousStatusId,
      });

      return refund;
    } catch (error: any) {
      throw new PaymentProcessingException(`Erro no estorno: ${error.message}`);
    }
  }

  /**
   * Cancela um pedido.
   *
   * Regras:
   * - Usuário: pode cancelar apenas pedidos com status PENDING
   * - Admin: pode cancelar qualquer estado permitido pela máquina de estados
   * - Ambos: verificação canTransitionTo() garante transições seguras
   */
  public async cancelOrder(orderId: string, userId: string, isAdmin: boolean): Promise<Order> {
    const order = await this.orderService.getOne(orderId, userId, isAdmin);

    // Idempotência: pedido já cancelado
    if (order.statusId === OrderStatus.CANCELLED) {
      return order;
    }

    // Máquina de estados
    if (!order.canTransitionTo(OrderStatus.CANCELLED)) {
      throw new AppError(
        isAdmin
          ? `Não é possível cancelar um pedido com status "${order.status?.label ?? order.statusId}".`
          : 'Apenas pedidos pendentes podem ser cancelados pelo cliente.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Regra rigorosa: só pode cancelar se for PENDING (1) ou PROCESSING (2)
    const canCancel = order.statusId === OrderStatus.PENDING || order.statusId === OrderStatus.PROCESSING;

    if (!canCancel) {
      throw new AppError(
        `Não é possível cancelar um pedido com status "${order.status?.label ?? order.statusId}". Pedidos pagos ou em trânsito não permitem cancelamento direto.`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const previousStatusId = order.statusId;

    await this.orderRepository.update(order.id, {
      statusId:    OrderStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    OrderHistoryService.record({
      order:         { ...order, statusId: previousStatusId } as Order,
      toStatusId:    OrderStatus.CANCELLED,
      changedById:   userId,
      changedByRole: isAdmin ? ChangedByRole.ADMIN : ChangedByRole.USER,
      notes:         isAdmin ? 'Cancelado pelo administrador' : 'Cancelado pelo cliente',
    });

    domainEvents.dispatch(OrderDomainEvent.ORDER_CANCELLED, {
      orderId:          order.id,
      userId:           order.user?.id,
      cancelledById:    userId,
      newStatusId:      OrderStatus.CANCELLED,
      previousStatusId,
    });

    order.statusId = OrderStatus.CANCELLED;
    return order;
  }

  /**
   * Consulta o status de um pagamento diretamente no Mercado Pago.
   */
  public async getPayment(paymentId: number): Promise<any> {
    try {
      return await paymentClient.get({ id: paymentId });
    } catch {
      throw new AppError('Pagamento não encontrado', HTTP_STATUS.NOT_FOUND);
    }
  }

  /**
   * Processa notificações IPN/Webhook do Mercado Pago.
   * Garante sincronização assíncrona e automática do status do pedido.
   */
  public async handleWebhook(payload: any): Promise<any> {
    const { type, data } = payload;

    if (type === 'payment' && data?.id) {
      try {
        log.info('[Webhook] MP notification received', { paymentId: data.id, type });

        const payment = await paymentClient.get({ id: data.id });
        const result  = payment as unknown as MercadoPagoPaymentResponse;
        const orderId = result.metadata?.order_id ?? result.external_reference;

        if (orderId) {
          const order = await this.orderRepository.findOne({
            where:     { id: orderId as string },
            relations: ['user', 'status'],
          });

          if (order) {
            await this.syncOrderWithPaymentResult(order, result);
            log.info('[Webhook] Order synchronized', { orderId, mpStatus: result.status });
          } else {
            log.warn('[Webhook] Order not found for payment', { orderId, paymentId: data.id });
          }
        }
      } catch (error: any) {
        log.error('[Webhook] Error processing notification', {
          error: error.message,
          payload,
        });
      }
    }

    return { received: true };
  }

  private handlePaymentError(error: any, orderId: string): never {
    const statusCode = error.statusCode ?? error.status ?? 500;
    const message    = error.message ?? 'Erro inesperado no checkout';

    log.error('[PaymentService] Payment failure', { orderId, statusCode, message });

    if (error.status_detail) {
      throw new PaymentRejectedException(
        this.getFriendlyMessage(error.status_detail as MercadoPagoStatusDetail),
        error.status_detail,
      );
    }

    throw new PaymentProcessingException(message);
  }

  private getFriendlyMessage(statusDetail: MercadoPagoStatusDetail): string {
    return (
      STATUS_DETAIL_MESSAGES[statusDetail] ??
      'Pagamento recusado. Tente novamente ou use outro método.'
    );
  }
}
