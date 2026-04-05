import { log } from '../../config/logger';
import { 
  PaymentRequestData, 
  MercadoPagoPaymentResponse 
} from '../../types/payment';
import { OrderService } from './OrderService';
import { Order, OrderStatus } from '../entities/Order';
import { PaymentMapper } from '../mappers/PaymentMapper';
import { 
  PaymentProcessingException, 
  PaymentRejectedException 
} from '../exceptions/PaymentException';
import { AppDataSource } from '../../data-source';
const { Payment } = require('../../config/mercadopago');

export class PaymentService {
  private orderService: OrderService;
  private orderRepository = AppDataSource.getRepository(Order);

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Processamento central de pagamento (Clean Architecture)
   * Delega mapeamento e foca no fluxo de negócio
   */
  public async processPayment(data: PaymentRequestData): Promise<any> {
    const orderId = data.metadata?.orderId || data.externalReference;
    
    if (!orderId) {
      throw new PaymentProcessingException('Identificador do pedido ausente na requisição');
    }

    log.info(`[PaymentService] Iniciando pagamento para o pedido: ${orderId}`);

    try {
      // 1. Busca e valida pedido
      // Usamos getOne que já lida com as relações necessárias (items, user, shippingAddress)
      const order = await this.orderService.getOne(orderId as string, undefined, true);
      if (!order) {
        throw new PaymentProcessingException(`Pedido ${orderId} não encontrado`);
      }

      // 2. Prepara payload para Mercado Pago (Delegação p/ Mapper)
      const mpBody = PaymentMapper.toMercadoPago(order, data);
      const idempotencyKey = `order_${order.id.toString()}_${Date.now()}`;
      
      // 3. Execução da transação externa
      const result = await this.executeTransaction(mpBody, idempotencyKey);

      // 4. Sincroniza estado do pedido
      await this.updateOrderWithPaymentResult(order, result);

      // 5. Normaliza resposta para o frontend
      return PaymentMapper.toFrontendResponse(result);

    } catch (error: any) {
      this.handlePaymentError(error, orderId as string);
    }
  }

  /**
   * Envia a requisição para a API do Mercado Pago com segurança
   */
  private async executeTransaction(body: any, idempotencyKey: string): Promise<MercadoPagoPaymentResponse> {
    try {
      // Usamos o cabeçalho X-Meli-Session-Id para pontuação de segurança máxima (Fingerprint)
      const options = {
        idempotencyKey,
        headers: {
          'X-Meli-Session-Id': body.metadata?.device_id || '',
        }
      };

      return await Payment.create({ body, ...options });
    } catch (error: any) {
      log.error('Erro na API Mercado Pago:', error);
      throw error;
    }
  }

  /**
   * Sincroniza o status do pedido baseando-se no resultado do pagamento
   */
  private async updateOrderWithPaymentResult(order: Order, result: MercadoPagoPaymentResponse): Promise<void> {
    const statusMap: Record<string, OrderStatus> = {
      approved: OrderStatus.PAID,
      pending: OrderStatus.PENDING,
      in_process: OrderStatus.PROCESSING,
      rejected: OrderStatus.CANCELLED,
      cancelled: OrderStatus.CANCELLED,
      refunded: OrderStatus.REFUNDED,
      charged_back: OrderStatus.REFUNDED
    };

    const newStatus = statusMap[result.status] || OrderStatus.PENDING;
    
    log.info(`[PaymentService] Atualizando pedido ${order.id} para status ${newStatus} (${result.status})`);
    
    // Atualizamos o registro diretamente para incluir dados do Mercado Pago
    await this.orderRepository.update(order.id, {
      status: newStatus,
      paymentId: result.id.toString(),
      paymentMethod: result.payment_method_id,
      installments: result.installments || 1,
    });
  }

  /**
   * Tratamento de erros centralizado que mapeia erros MP para domínio amigável
   */
  private handlePaymentError(error: any, orderId: string): never {
    const status = error.status || 500;
    const cause = error.cause || [];
    const message = error.message || 'Erro inesperado';

    // Log detalhado para o servidor (Segurança)
    log.error(`[PaymentService] Erro no pedido ${orderId}:`, {
      status,
      message,
      cause
    });

    // Mapeamento de rejeições comuns (User Friendly)
    if (status === 400 && Array.isArray(cause)) {
      const invalidFields = cause.map((c: any) => c.code).join(', ');
      throw new PaymentProcessingException(`Dados inválidos enviados ao Mercado Pago: [${invalidFields}]`);
    }

    // Erros de cartões rejeitados
    if (error.status_detail) {
      throw new PaymentRejectedException(
        this.getFriendlyMessage(error.status_detail),
        error.status_detail
      );
    }

    throw new PaymentProcessingException(`Falha ao processar pagamento: ${message}`);
  }

  private getFriendlyMessage(statusDetail: string): string {
    const messages: Record<string, string> = {
      cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão.',
      cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro método.',
      cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
      cc_rejected_bad_filled_date: 'Data de validade inválida.',
      cc_rejected_call_for_authorize: 'Autorize o pagamento com seu banco primeiro.',
      cc_rejected_invalid_installments: 'Número de parcelas inválido.',
      cc_rejected_duplicated_payment: 'Pagamento duplicado detectado.',
    };
    return messages[statusDetail] || 'Pagamento recusado pelo emissor do cartão.';
  }
}
