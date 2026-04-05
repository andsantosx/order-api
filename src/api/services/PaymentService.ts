import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import { log } from '../../config/logger';
import { MercadoPagoPaymentResponse } from '../../types/payment';
import { OrderService } from './OrderService';
import { Order, OrderStatus } from '../entities/Order';
import { PaymentMapper } from '../mappers/PaymentMapper';
import {
  PaymentException,
  PaymentProcessingException,
  PaymentRejectedException,
} from '../exceptions/PaymentException';
import { AppDataSource } from '../../data-source';
import { client } from '../../config/mercadopago';
import { Payment, PaymentRefund } from 'mercadopago';

const paymentClient = new Payment(client);
const refundClient = new PaymentRefund(client);

export class PaymentService {
  private orderService: OrderService;
  private orderRepository = AppDataSource.getRepository(Order);

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Processamento central de pagamento (Clean Architecture)
   */
  public async processPayment(data: any): Promise<any> {
    const orderId = data.orderId || data.externalReference || data.metadata?.orderId;

    if (!orderId) {
      throw new PaymentProcessingException(
        'Identificador do pedido (orderId) ausente na requisição',
      );
    }

    try {
      // 1. Busca e valida pedido
      const order = await this.orderService.getOne(orderId as string, undefined, true);
      if (!order) {
        throw new PaymentProcessingException(`Pedido ${orderId} não encontrado`);
      }

      // 2. Prepara payload
      const mpBody = PaymentMapper.toMercadoPago(order, data);
      const idempotencyKey = `order_${order.id}_${Date.now()}`;

      // 3. Executa a transação
      const response = await paymentClient.create({
        body: mpBody,
        requestOptions: { idempotencyKey },
      });

      const result = response as unknown as MercadoPagoPaymentResponse;

      // 4. Sincroniza estado do pedido
      await this.updateOrderWithPaymentResult(order, result);

      // 5. Normaliza resposta
      return PaymentMapper.toFrontendResponse(result);
    } catch (error: any) {
      this.handlePaymentError(error, orderId as string);
    }
  }

  private async updateOrderWithPaymentResult(
    order: Order,
    result: MercadoPagoPaymentResponse,
  ): Promise<void> {
    const statusMap: Record<string, OrderStatus> = {
      approved: OrderStatus.PAID,
      pending: OrderStatus.PENDING,
      in_process: OrderStatus.PROCESSING,
      rejected: OrderStatus.CANCELLED,
      cancelled: OrderStatus.CANCELLED,
      refunded: OrderStatus.REFUNDED,
    };

    const newStatus = statusMap[result.status] || OrderStatus.PENDING;

    await this.orderRepository.update(order.id, {
      statusId: newStatus,
      paymentId: result.id.toString(),
      paymentMethod: result.payment_method_id,
      installments: result.installments || 1,
    });
  }

  public async refundPayment(orderId: string): Promise<any> {
    const order = await this.orderService.getOne(orderId, undefined, true);
    if (!order || !order.paymentId) {
      throw new PaymentProcessingException('Pedido não encontrado ou sem ID de pagamento');
    }

    try {
      const refund = await refundClient.create({ payment_id: Number(order.paymentId) });

      await this.orderRepository.update(order.id, {
        statusId: OrderStatus.REFUNDED,
      });

      return refund;
    } catch (error: any) {
      throw new PaymentProcessingException(`Erro no estorno: ${error.message}`);
    }
  }

  /**
   * Cancela um pedido
   */
  public async cancelOrder(orderId: string, userId: string, isAdmin: boolean): Promise<Order> {
    const order = await this.orderService.getOne(orderId as string, userId, isAdmin);

    if (order.statusId === OrderStatus.CANCELLED) {
      return order;
    }

    // Apenas pedidos pendentes podem ser cancelados sem estorno
    if (order.statusId !== OrderStatus.PENDING) {
      throw new AppError(
        'Apenas pedidos pendentes podem ser cancelados diretamente. Pedidos pagos exigem estorno.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    await this.orderRepository.update(order.id, {
      statusId: OrderStatus.CANCELLED,
    });

    order.statusId = OrderStatus.CANCELLED;
    return order;
  }

  public async getPayment(paymentId: number): Promise<any> {
    try {
      return await paymentClient.get({ id: paymentId });
    } catch (error: any) {
      throw new AppError('Pagamento não encontrado', HTTP_STATUS.NOT_FOUND);
    }
  }

  public async handleWebhook(payload: any): Promise<any> {
    const { type, data } = payload;
    if (type === 'payment' && data?.id) {
      try {
        const payment = await paymentClient.get({ id: data.id });
        const result = payment as unknown as MercadoPagoPaymentResponse;
        const orderId = result.metadata?.order_id || result.external_reference;

        if (orderId) {
          const order = await this.orderRepository.findOneBy({ id: orderId as any });
          if (order) {
            await this.updateOrderWithPaymentResult(order, result);
          }
        }
      } catch (error: any) {
        log.error(`Webhook error: ${error.message}`);
      }
    }
    return { received: true };
  }

  private handlePaymentError(error: any, orderId: string): never {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Erro inesperado no checkout';

    log.error(`Payment failure for ${orderId}: ${message}`, { orderId, statusCode });

    if (error.status_detail) {
      throw new PaymentRejectedException(
        this.getFriendlyMessage(error.status_detail),
        error.status_detail,
      );
    }

    throw new PaymentProcessingException(message);
  }

  private getFriendlyMessage(statusDetail: string): string {
    const messages: Record<string, string> = {
      cc_rejected_insufficient_amount: 'Saldo insuficiente.',
      cc_rejected_high_risk: 'Recusado por segurança.',
      cc_rejected_bad_filled_card_number: 'Número inválido.',
      cc_rejected_bad_filled_date: 'Data inválida.',
    };
    return messages[statusDetail] || 'Pagamento recusado.';
  }
}
