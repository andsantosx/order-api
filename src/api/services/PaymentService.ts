import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import { Payment, PaymentRefund } from 'mercadopago';
import { client } from '../../config/mercadopago';
import { PaymentRequestData, MercadoPagoError, WebhookQuery, WebhookBody } from '../../types/payment';
import { log } from '../../config/logger';
import { MONEY, ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

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
     * 
     * Fluxo:
     * 1. Valida pedido
     * 2. Prepara dados do pagamento (converte centavos → reais)
     * 3. Envia para Mercado Pago
     * 4. Atualiza status do pedido conforme resposta
     * 
     * @param orderId - ID do pedido
     * @param paymentData - Dados do pagamento (payer, payment_method_id, etc)
     * @returns Resultado do pagamento do Mercado Pago
     * @throws {AppError} 400 - Dados inválidos
     * @throws {AppError} 404 - Pedido não encontrado
     * @throws {AppError} 500 - Erro ao processar pagamento
     * 
     * @example
     * const result = await paymentService.processPayment(orderId, {
     *     payment_method_id: 'pix',
     *     payer: {
     *         email: 'user@example.com',
     *         identification: { type: 'CPF', number: '12345678900' },
     *         first_name: 'João',
     *         last_name: 'Silva'
     *     }
     * });
     */
    async processPayment(orderId: string, paymentData: PaymentRequestData) {
        // Valida input
        if (!orderId) {
            throw new AppError('Order ID é obrigatório', HTTP_STATUS.BAD_REQUEST);
        }

        // Busca pedido
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['user'],
        });

        if (!order) {
            throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        try {
            const payment = new Payment(client);

            // Prepara body do pagamento
            const paymentBody = this.preparePaymentBody(order, paymentData);

            log.info('Processando pagamento com Mercado Pago', {
                orderId: order.id,
                amount: paymentBody.transaction_amount,
                paymentMethod: paymentBody.payment_method_id
            });

            // Envia para Mercado Pago
            const result = await payment.create({ body: paymentBody });

            log.info('Pagamento processado com sucesso', {
                orderId: order.id,
                paymentId: result.id,
                status: result.status
            });

            // Atualiza pedido com dados do pagamento
            await this.updateOrderWithPaymentResult(order, result as unknown as Record<string, unknown>);

            return result;

        } catch (error) {
            return this.handlePaymentError(error, orderId);
        }
    }

    /**
     * Processa reembolso de um pedido
     * 
     * Requisitos:
     * - Pedido deve estar pago
     * - Deve ter payment_id do Mercado Pago
     * 
     * @param orderId - ID do pedido a reembolsar
     * @returns Resultado do reembolso
     * @throws {AppError} 400 - Pedido não está pago ou sem payment_id
     * @throws {AppError} 404 - Pedido não encontrado
     * @throws {AppError} 500 - Erro ao processar reembolso
     */
    async refundPayment(orderId: string) {
        const order = await this.orderRepository.findOneBy({ id: orderId });

        if (!order) {
            throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        if (!order.payment_id) {
            throw new AppError(
                'Pedido não possui ID de pagamento associado',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.SHIPPED) {
            throw new AppError(
                'Apenas pedidos pagos ou enviados podem ser reembolsados',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        try {
            log.info('Iniciando reembolso', {
                orderId: order.id,
                paymentId: order.payment_id
            });

            const refundClient = new PaymentRefund(client);
            const result = await refundClient.create({ payment_id: order.payment_id });

            if (result.status !== 'approved' && result.status !== 'refunded' && result.status !== null) {
                throw new AppError(
                    `Reembolso falhou com status: ${result.status}`,
                    HTTP_STATUS.INTERNAL_SERVER_ERROR
                );
            }

            // Reembolso aprovado
            order.status = OrderStatus.REFUNDED;
            await this.orderRepository.save(order);

            log.info('Reembolso processado com sucesso', {
                orderId,
                refundId: result.id,
                paymentId: order.payment_id
            });

            return {
                success: true,
                message: 'Reembolso processado com sucesso',
                external_reference: result.id
            };
        } catch (error) {
            log.error('Erro ao processar reembolso', {
                orderId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new AppError(ERROR_MESSAGES.REFUND_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Cancela um pedido e tenta cancelar/reembolsar o pagamento
     * 
     * Regras de autorização:
     * - Usuário regular: só pode cancelar seus próprios pedidos pendentes
     * - Admin: pode cancelar qualquer pedido em qualquer status
     * 
     * @param orderId - ID do pedido
     * @param userId - ID do usuário solicitante
     * @param isAdmin - Se o usuário é admin
     * @throws {AppError} 403 - Não autorizado
     * @throws {AppError} 404 - Pedido não encontrado
     */
    async cancelOrder(orderId: string, userId: string, isAdmin: boolean = false) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['user']
        });

        if (!order) {
            throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        // Verifica autorização
        if (!isAdmin && order.user?.id !== userId) {
            throw new AppError(ERROR_MESSAGES.ORDER_UNAUTHORIZED, HTTP_STATUS.FORBIDDEN);
        }

        // Usuário regular só pode cancelar pedidos pendentes
        if (!isAdmin && order.status !== OrderStatus.PENDING) {
            throw new AppError(
                'Apenas pedidos pendentes podem ser cancelados',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Se tem payment_id, tenta cancelar/reembolsar no Mercado Pago
        if (order.payment_id) {
            try {
                const payment = new Payment(client);
                await payment.cancel({ id: Number(order.payment_id) });

                log.info('Pagamento cancelado no Mercado Pago', {
                    orderId: order.id,
                    paymentId: order.payment_id
                });
            } catch (error) {
                log.warn('Falha ao cancelar pagamento no Mercado Pago - prosseguindo com cancelamento local', {
                    orderId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        // Atualiza status do pedido
        order.status = OrderStatus.CANCELED;
        await this.orderRepository.save(order);

        log.info('Pedido cancelado', {
            orderId: order.id,
            userId,
            isAdmin
        });

        return { success: true, message: 'Pedido cancelado com sucesso' };
    }

    /**
     * Processa webhooks (IPNs) do Mercado Pago
     * 
     * Mercado Pago envia notificações quando o status de um pagamento muda.
     * Este método:
     * 1. Extrai o ID do pagamento do webhook
     * 2. Consulta status atualizado do pagamento
     * 3. Atualiza o pedido correspondente
     * 
     * **Importante**: Webhooks podem vir em formatos diferentes (query params ou body).
     * Este método suporta ambos.
     * 
     * @param query - Query parameters do webhook
     * @param body - Body do webhook
     * @returns Status HTTP para responder ao Mercado Pago
     */
    async receiveWebhook(query: WebhookQuery, body: WebhookBody) {
        try {
            // Extrai payment ID de múltiplas possíveis localizações
            const paymentId = this.extractPaymentIdFromWebhook(query, body);
            const webhookType = query.type || query.topic || body?.type || 'unknown';

            log.info('Webhook recebido do Mercado Pago', {
                type: webhookType,
                paymentId
            });

            if (!paymentId) {
                log.warn('Webhook sem payment ID - ignorando', { query, body });
                return 200; // Retorna 200 para evitar retentativas
            }

            // Busca informações atualizadas do pagamento
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: Number(paymentId) });

            log.info('Status do pagamento consultado', {
                paymentId,
                status: paymentInfo.status,
                statusDetail: paymentInfo.status_detail
            });

            // Atualiza pedido baseado no status do pagamento
            await this.processPaymentStatusUpdate(paymentInfo as unknown as Record<string, unknown>);

            return 200;

        } catch (error) {
            log.error('Erro ao processar webhook', {
                error: error instanceof Error ? error.message : 'Unknown error',
                query,
                body
            });
            return 500;
        }
    }

    /* ==========================================
     * MÉTODOS PRIVADOS - HELPERS
     * ========================================== */

    /**
     * Prepara body do pagamento para envio ao Mercado Pago
     * Normaliza dados e converte valores monetários
     */
    private preparePaymentBody(order: Order, paymentData: PaymentRequestData): PaymentRequestData {
        // Normaliza dados (handle formData wrapper do frontend)
        const rawData = paymentData.formData || paymentData;

        // Valida e extrai email
        const email = rawData.payer?.email ||
            paymentData.payer?.email ||
            order.user?.email ||
            order.guest_email;

        if (!email) {
            throw new AppError('Email do pagador é obrigatório', HTTP_STATUS.BAD_REQUEST);
        }

        // Valida documento
        const docType = rawData.payer?.identification?.type || 'CPF';
        const docNumber = rawData.payer?.identification?.number ||
            paymentData.payer?.identification?.number;

        if (!docNumber) {
            throw new AppError(
                'Número de identificação do pagador é obrigatório',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Monta body do pagamento
        return {
            transaction_amount: Number(order.total_amount) / MONEY.CENTS_PER_REAL,
            description: `Order ${order.id} - ${paymentData.description || 'Purchase'}`,
            payment_method_id: rawData.payment_method_id,
            payer: {
                email,
                identification: {
                    type: docType,
                    number: docNumber,
                },
                first_name: rawData.payer?.first_name || '',
                last_name: rawData.payer?.last_name || ''
            },
            metadata: {
                order_id: order.id,
            },
            ...(rawData.installments && { installments: rawData.installments }),
            ...(rawData.token && { token: rawData.token }),
            ...(rawData.issuer_id && { issuer_id: Number(rawData.issuer_id) })
        };
    }

    /**
     * Atualiza pedido com resultado do pagamento
     */
    private async updateOrderWithPaymentResult(order: Order, paymentResult: Record<string, unknown>): Promise<void> {
        order.payment_id = String(paymentResult.id);
        const status = paymentResult.status as string;

        // Aprovado
        if (status === 'approved') {
            order.status = OrderStatus.PAID;
            await this.orderRepository.save(order);
            log.info('Pedido atualizado para PAID', {
                orderId: order.id,
                paymentId: order.payment_id
            });
            return;
        }

        // Pendente
        if (status === 'pending') {
            order.status = OrderStatus.PENDING;
            await this.orderRepository.save(order);
            log.info('Pedido mantido como PENDING', {
                orderId: order.id,
                paymentId: order.payment_id
            });
            return;
        }

        // Rejeitado ou cancelado
        if (status === 'rejected' || status === 'cancelled') {
            order.status = OrderStatus.CANCELED;
            await this.orderRepository.save(order);
            log.info('Pedido marcado como CANCELED', {
                orderId: order.id,
                paymentId: order.payment_id,
                reason: status
            });
            return;
        }

        // Status desconhecido - apenas salva payment_id
        await this.orderRepository.save(order);
        log.warn('Status de pagamento desconhecido', {
            orderId: order.id,
            paymentId: order.payment_id,
            status
        });
    }

    /**
     * Trata erros do Mercado Pago
     * Loga detalhes e lança AppError apropriado
     * 
     * @throws {AppError} sempre - nunca retorna normalmente
     */
    private handlePaymentError(error: unknown, orderId: string): never {
        const mpError = error as MercadoPagoError;

        log.error('Erro ao processar pagamento', {
            orderId,
            message: mpError.message,
            status: mpError.status,
            cause: mpError.cause
        });

        // Loga detalhes técnicos se disponíveis
        if (mpError.cause) {
            log.error('Detalhes do erro do Mercado Pago', {
                orderId,
                cause: typeof mpError.cause === 'object'
                    ? JSON.stringify(mpError.cause)
                    : String(mpError.cause)
            });
        }

        throw new AppError(
            ERROR_MESSAGES.PAYMENT_FAILED,
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    /**
     * Extrai payment ID de webhook
     * Suporta múltiplos formatos enviados pelo Mercado Pago
     */
    private extractPaymentIdFromWebhook(query: WebhookQuery, body: WebhookBody): string | undefined {
        return query.id ||
            query['data.id'] ||
            body?.data?.id ||
            body?.id;
    }

    /**
     * Processa atualização de status de pagamento via webhook
     * Atualiza o pedido correspondente no banco
     */
    private async processPaymentStatusUpdate(paymentInfo: Record<string, unknown>): Promise<void> {
        const orderId = (paymentInfo.metadata as Record<string, unknown>)?.order_id as string;

        if (!orderId) {
            log.warn('Webhook sem order_id no metadata', { paymentInfo });
            return;
        }

        const order = await this.orderRepository.findOneBy({ id: orderId });
        if (!order) {
            log.warn('Pedido não encontrado para webhook', { orderId });
            return;
        }

        const status = paymentInfo.status as string;

        // Atualiza status do pedido com base no pagamento
        if (status === 'approved' && order.status !== OrderStatus.PAID) {
            order.status = OrderStatus.PAID;
            await this.orderRepository.save(order);
            log.info('Pedido atualizado para PAID via webhook', { orderId });
            return;
        }

        if (status === 'refunded' && order.status !== OrderStatus.REFUNDED) {
            order.status = OrderStatus.REFUNDED;
            await this.orderRepository.save(order);
            log.info('Pedido atualizado para REFUNDED via webhook', { orderId });
            return;
        }

        // Status recebido mas sem alteração necessária
        log.info('Status de pagamento recebido mas pedido não alterado', {
            orderId,
            paymentStatus: status,
            currentOrderStatus: order.status
        });
    }
}
