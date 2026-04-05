import { AppDataSource } from '../../data-source';
import crypto from 'crypto';
import { Order, OrderStatus } from '../entities/Order';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import { Payment, PaymentRefund } from 'mercadopago';
import { client } from '../../config/mercadopago';
import {
  PaymentRequestData,
  PaymentItem,
  WebhookQuery,
  WebhookBody,
  PaymentRequestBody,
  PaymentFormData,
  PayerData,
  MercadoPagoError,
} from '../../types/payment';
import { domainEvents } from '../domain/events/DomainEvents';
import { log } from '../../config/logger';
import { MONEY, ERROR_MESSAGES, HTTP_STATUS } from '../../constants';
import { env } from '../../config/env';

/**
 * Service responsável pela lógica de negócio de pagamentos
 *
 * Gerencia a integração com Mercado Pago para:
 * - Processar pagamentos (PIX, cartão, etc)
 * - Processar reembolsos
 * - Receber e processar webhooks/IPN
 * - Cancelar pedidos e pagamentos
 *
 * Todos os valores monetários são em centavos internamente,
 * convertidos para decimal ao enviar para Mercado Pago.
 */
export class PaymentService {
  private orderRepository = AppDataSource.getRepository(Order);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Processa um pagamento via Mercado Pago
   * Concentra a orquestração do fluxo de pagamento (Clean Architecture)
   */
  async processPayment(orderId: string, paymentData: PaymentRequestData) {
    if (!orderId) {
      throw new AppError('Order ID é obrigatório', HTTP_STATUS.BAD_REQUEST);
    }

    // Busca pedido com as relações necessárias
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'items', 'items.product', 'shippingAddress'],
    });

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    try {
      const payment = new Payment(client);

      // Orquestra a preparação do payload (Separação de Preocupações)
      const paymentBody = this.preparePaymentBody(order, paymentData);
      // Log sanitizado do request para depurar erro 400
      const sanitizedBody = {
        ...paymentBody,
        token: paymentBody.token ? '***' + paymentBody.token.slice(-4) : undefined,
        payer: {
          ...paymentBody.payer,
          identification: { ...paymentBody.payer?.identification, number: '***' }
        }
      };

      log.info('Processando pagamento com Mercado Pago', {
        orderId: order.id,
        amount: paymentBody.transaction_amount,
        paymentMethod: paymentBody.payment_method_id,
        requestBody: sanitizedBody // Ajuda a ver o que estamos enviando de fato
      });

      // Extrai o Device ID para análise de fraude (100/100 MP)
      const rawData: any = { ...paymentData, ...(paymentData.formData || {}) };
      const deviceId = rawData.deviceId || rawData.device_id || (paymentData as any).deviceId || (paymentData as any).device_id;
      const customHeaders: Record<string, string> = {
        'x-idempotency-key': order.idempotencyKey || order.id,
      };

      if (deviceId && deviceId !== 'not_provided') {
        customHeaders['x-meli-session-id'] = deviceId;
      }

      // Cria pagamento no Mercado Pago com Idempotência (Segurança)
      const result = await payment.create({
        body: paymentBody as any,
        requestOptions: {
          idempotencyKey: order.idempotencyKey || order.id,
          customHeaders,
        } as any,
      });

      log.info('Pagamento processado com sucesso', {
        orderId: order.id,
        paymentId: result.id,
        status: result.status,
      });

      // Atualiza pedido com dados do pagamento (Responsabilidade delegada)
      await this.updateOrderWithPaymentResult(order, result as unknown as Record<string, unknown>);

      return result;
    } catch (_error) {
      log.error('Erro detalhado no processamento de pagamento:', {
        orderId,
        error: _error instanceof Error ? _error.message : 'Unknown',
        stack: _error instanceof Error ? _error.stack : undefined,
        raw: _error
      });
      return this.handlePaymentError(_error, orderId);
    }
  }

  /**
   * Processa reembolso de um pedido
   */
  async refundPayment(orderId: string) {
    const order = await this.orderRepository.findOneBy({ id: orderId });

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (!order.paymentId) {
      throw new AppError('Pedido não possui ID de pagamento associado', HTTP_STATUS.BAD_REQUEST);
    }

    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.SHIPPED) {
      throw new AppError(
        'Apenas pedidos pagos ou enviados podem ser reembolsados',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    try {
      const refundClient = new PaymentRefund(client);
      const result = await refundClient.create({ payment_id: order.paymentId });

      if (result.status !== 'approved' && result.status !== 'refunded' && result.status !== null) {
        throw new AppError(
          `Reembolso falhou com status: ${result.status}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        );
      }

      order.status = OrderStatus.REFUNDED;
      await this.orderRepository.save(order);

      log.info('Reembolso processado com sucesso', { orderId, refundId: result.id });
      return {
        success: true,
        message: 'Reembolso processado com sucesso',
        external_reference: result.id,
      };
    } catch (error) {
      log.error('Erro ao processar reembolso', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new AppError(ERROR_MESSAGES.REFUND_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Cancela um pedido e tenta cancelar no Mercado Pago
   */
  async cancelOrder(orderId: string, userId: string, isAdmin: boolean = false) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (!isAdmin && order.user?.id !== userId) {
      throw new AppError(ERROR_MESSAGES.ORDER_UNAUTHORIZED, HTTP_STATUS.FORBIDDEN);
    }

    if (!isAdmin && order.status !== OrderStatus.PENDING) {
      throw new AppError('Apenas pedidos pendentes podem ser cancelados', HTTP_STATUS.BAD_REQUEST);
    }

    if (order.paymentId) {
      try {
        const payment = new Payment(client);
        await payment.cancel({ id: Number(order.paymentId) });
      } catch (error) {
        log.warn('Falha no cancelamento externo - prosseguindo local', { orderId });
      }
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return { success: true, message: 'Pedido cancelado com sucesso' };
  }

  /**
   * Processa notificações de Webhook (Segurança)
   */
  async receiveWebhook(
    query: WebhookQuery,
    body: WebhookBody,
    signatureHeader?: string,
    requestIdHeader?: string,
  ) {
    try {
      const paymentId = query.id || body.data?.id || body.id;

      if (signatureHeader && requestIdHeader && paymentId) {
        const isValid = this.verifySignature(signatureHeader, requestIdHeader, paymentId);
        if (!isValid && env.NODE_ENV === 'production') {
          throw new AppError('Assinatura de webhook inválida', HTTP_STATUS.UNAUTHORIZED);
        }
      }

      if (!paymentId) return 200;

      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: Number(paymentId) });

      await this.processPaymentStatusUpdate(paymentInfo as unknown as Record<string, unknown>);

      return 200;
    } catch (error: unknown) {
      log.error('Erro no webhook', { error: error instanceof Error ? error.message : 'Unknown' });
      return 500;
    }
  }

  /* ==========================================
   * HELPERS DE MAPEAMENTO E NEGÓCIO (Clean Code)
   * ========================================== */

  private preparePaymentBody(order: Order, paymentData: PaymentRequestData): PaymentRequestBody {
    // Mescla os dados da raiz com os dados do formData para garantir que nada se perca
    const rawData: any = { ...paymentData, ...(paymentData.formData || {}) };
    const email = rawData.payer?.email || (rawData as any).email || order.user?.email || order.guestEmail;

    if (!email) throw new AppError('Email obrigatório', HTTP_STATUS.BAD_REQUEST);

    const docType = (rawData.payer?.identification?.type || rawData.formData?.payer?.identification?.type || (paymentData as any).payer?.identification?.type || 'CPF').toUpperCase();
    const rawDocNumber = rawData.payer?.identification?.number || rawData.formData?.payer?.identification?.number || (paymentData as any).payer?.identification?.number || order.user?.document || '';
    const docNumber = rawDocNumber.replace(/\D/g, ''); // Ensure only digits for MP identification number

    if (!docNumber) throw new AppError('Documento obrigatório', HTTP_STATUS.BAD_REQUEST);

    const payer = this.mapPayer(order, rawData, email, docType, docNumber);
    const items = this.mapItems(order);

    const paymentMethodId = rawData.paymentMethodId || rawData.payment_method_id || (paymentData as any).paymentMethodId || (paymentData as any).payment_method_id;
    const token = rawData.token || (rawData as any).token || (paymentData as any).token;

    if (!paymentMethodId) throw new AppError('Método de pagamento obrigatório', HTTP_STATUS.BAD_REQUEST);
    // Token é obrigatório para cartões (se o method não for pix ou bolbradesco)
    if (!['pix', 'bolbradesco'].includes(paymentMethodId) && !token) {
      throw new AppError('Token do cartão obrigatório', HTTP_STATUS.BAD_REQUEST);
    }

    const deviceId = rawData.deviceId || rawData.device_id || (paymentData as any).deviceId || (paymentData as any).device_id || 'not_provided';

    return {
      transaction_amount: Number(order.totalAmount) / MONEY.CENTS_PER_REAL,
      description: `Pedido #${order.id.substring(0, 8)}`,
      payment_method_id: paymentMethodId,
      external_reference: order.id,
      notification_url: env.MERCADOPAGO_WEBHOOK_URL,
      statement_descriptor: 'ORDER STORE',
      binary_mode: true,
      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
        identification: payer.identification,
        phone: {
          area_code: payer.phone?.areaCode || '55',
          number: payer.phone?.number || '000000000',
        },
        address: payer.address ? {
          zip_code: payer.address.zipCode || '',
          street_name: payer.address.streetName || '',
          street_number: payer.address.streetNumber || 'S/N',
        } : undefined,
      },
      additional_info: {
        items: items.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category_id: item.categoryId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        payer: {
          first_name: payer.firstName,
          last_name: payer.lastName,
          registration_date: (order.user?.createdAt || new Date()).toISOString(),
          phone: payer.phone
            ? {
              area_code: payer.phone.areaCode || '55',
              number: payer.phone.number || '000000000',
            }
            : undefined,
          address: payer.address
            ? {
              zip_code: payer.address.zipCode || '',
              street_name: payer.address.streetName || '',
              street_number: payer.address.streetNumber || 'S/N',
            }
            : undefined,
        },
      },
      back_urls: {
        success: `${env.FRONTEND_URL}/order-confirmation?orderId=${order.id}`,
        failure: `${env.FRONTEND_URL}/checkout?error=payment_failed&orderId=${order.id}`,
        pending: `${env.FRONTEND_URL}/order-confirmation?orderId=${order.id}&status=pending`,
      },
      auto_return: 'approved',
      metadata: { order_id: order.id, device_id: deviceId },
      installments: rawData.installments ? Number(rawData.installments) : undefined,
      token: token,
      issuer_id: rawData.issuerId || rawData.issuer_id ? Number(rawData.issuerId || rawData.issuer_id) : undefined,
    };
  }

  private mapPayer(
    order: Order,
    rawData: PaymentFormData,
    email: string,
    docType: string,
    docNumber: string,
  ): PayerData {
    const payerFirstName = rawData.payer?.firstName || rawData.payer?.first_name;
    const payerLastName = rawData.payer?.lastName || rawData.payer?.last_name;

    const fullName = (payerFirstName
      ? `${payerFirstName} ${payerLastName || ''}`.trim()
      : order.user?.name || 'Customer').trim();

    const parts = fullName.split(' ');
    const firstName = parts[0] || 'Customer';
    const lastName = parts.slice(1).join(' ') || 'User';

    const rawPhone = (order.phone || order.user?.phone || '000000000').replace(/\D/g, '');
    const area = rawPhone.length >= 10 ? rawPhone.substring(0, 2) : '55';
    const number = rawPhone.length >= 10 ? rawPhone.substring(2) : rawPhone;

    return {
      email,
      identification: { type: docType, number: docNumber },
      firstName: firstName,
      lastName: lastName,
      phone: { areaCode: area, number: number },
      address: order.shippingAddress?.[0]
        ? {
          zipCode: order.shippingAddress[0].zipCode,
          streetName: order.shippingAddress[0].street,
          streetNumber: 'S/N',
        }
        : undefined,
    };
  }

  private mapItems(order: Order): PaymentItem[] {
    return (order.items || []).map(item => ({
      id: item.product?.id || item.id,
      title: item.product?.name || 'Produto',
      description: (item.product?.description || item.product?.name || 'Físico').substring(0, 255),
      categoryId: this.mapCategory(item.product?.category?.name),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice) / MONEY.CENTS_PER_REAL, // FIX: Convert cents to Reais for MP
    }));
  }

  /**
   * Mapeia categorias internas para categorias padrão do Mercado Pago (Score 100/100)
   */
  private mapCategory(categoryName?: string): string {
    if (!categoryName) return 'others';

    const cat = categoryName.toLowerCase();
    if (cat.includes('eletron') || cat.includes('tech')) return 'electronics';
    if (cat.includes('roupa') || cat.includes('vestu')) return 'fashion';
    if (cat.includes('comida') || cat.includes('bebi')) return 'food';
    if (cat.includes('brinquedo')) return 'toys';
    if (cat.includes('saude') || cat.includes('beleza')) return 'health';
    if (cat.includes('livro')) return 'books';

    return 'others';
  }

  private async updateOrderWithPaymentResult(
    order: Order,
    result: Record<string, unknown>,
  ): Promise<void> {
    order.paymentId = String(result.id);
    const status = result.status as string;

    if (status === 'approved') order.status = OrderStatus.PAID;
    else if (status === 'pending') order.status = OrderStatus.PENDING;
    else if (['rejected', 'cancelled'].includes(status)) order.status = OrderStatus.CANCELLED;

    await this.orderRepository.save(order);

    if (status === 'approved' && order.user?.id) {
      domainEvents.dispatch('PAYMENT_APPROVED', {
        userId: order.user.id,
        orderId: order.id,
        status: order.status,
      });
    }
  }

  private async processPaymentStatusUpdate(paymentInfo: Record<string, unknown>): Promise<void> {
    const orderId = (paymentInfo.metadata as Record<string, unknown>)?.order_id as string;
    if (!orderId) return;

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });
    if (!order) return;

    const status = paymentInfo.status as string;
    let changed = false;

    if (status === 'approved' && order.canTransitionTo(OrderStatus.PAID)) {
      order.status = OrderStatus.PAID;
      changed = true;
      if (order.user?.id) {
        domainEvents.dispatch('PAYMENT_APPROVED', {
          userId: order.user.id,
          orderId: order.id,
          status: order.status,
        });
      }
    } else if (status === 'refunded' && order.canTransitionTo(OrderStatus.REFUNDED)) {
      order.status = OrderStatus.REFUNDED;
      changed = true;
    }

    if (changed) await this.orderRepository.save(order);
  }

  private handlePaymentError(error: any, orderId: string) {
    const mpError = error as MercadoPagoError;
    const responseData = (error as any).response?.data;

    log.error('Erro ao processar pagamento no Mercado Pago', {
      orderId,
      message: mpError.message,
      cause: mpError.cause,
      status: mpError.status,
      responseData: responseData,
      rawError: error // Mais detalhado para diagnóstico
    });
    throw new AppError(ERROR_MESSAGES.PAYMENT_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  private verifySignature(xSignature: string, xRequestId: string, dataId: string): boolean {
    try {
      const parts = xSignature.split(',');
      let ts = '',
        hash = '';
      parts.forEach((p) => {
        const [k, v] = p.split('=');
        if (k === 'ts') ts = v;
        if (k === 'v1') hash = v;
      });
      if (!ts || !hash) return false;
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto
        .createHmac('sha256', env.MERCADOPAGO_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex');
      return hmac === hash;
    } catch {
      return false;
    }
  }
}
