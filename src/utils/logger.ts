import { log } from '../config/logger';

/**
 * Utilitários de logging estruturado para eventos específicos do domínio
 * Centraliza logs importantes para facilitar monitoramento e debugging
 */

/**
 * Loga a criação de um pedido
 */
export function logOrderCreated(orderId: string, userId: string | undefined, totalAmount: number) {
  log.info('Pedido criado com sucesso', {
    orderId,
    userId: userId || 'guest',
    totalAmount: totalAmount / 100, // Converte centavos para reais
    event: 'order_created',
  });
}

/**
 * Loga o processamento de um pagamento
 */
export function logPaymentProcessed(
  orderId: string,
  paymentId: string,
  paymentMethod: string,
  status: string,
) {
  log.info('Pagamento processado', {
    orderId,
    paymentId,
    paymentMethod,
    status,
    event: 'payment_processed',
  });
}

/**
 * Loga um reembolso processado
 */
export function logRefundProcessed(orderId: string, paymentId: string) {
  log.info('Reembolso processado', {
    orderId,
    paymentId,
    event: 'refund_processed',
  });
}

/**
 * Loga uma autenticação bem-sucedida
 */
export function logUserAuthenticated(userId: string, email: string) {
  log.info('Usuário autenticado', {
    userId,
    email,
    event: 'user_authenticated',
  });
}

/**
 * Loga um registro de novo usuário
 */
export function logUserRegistered(userId: string, email: string) {
  log.info('Novo usuário registrado', {
    userId,
    email,
    event: 'user_registered',
  });
}

/**
 * Loga uma tentativa de autenticação falhada
 * Não inclui informações sensíveis como email ou senha
 */
export function logAuthenticationFailed(reason: string) {
  log.warn('Tentativa de autenticação falhada', {
    reason,
    event: 'authentication_failed',
  });
}

/**
 * Loga um erro de validação
 */
export function logValidationError(path: string, field: string, error: string) {
  log.warn('Erro de validação', {
    path,
    field,
    error,
    event: 'validation_error',
  });
}

/**
 * Loga um webhook recebido
 */
export function logWebhookReceived(type: string, paymentId: string) {
  log.info('Webhook recebido', {
    type,
    paymentId,
    event: 'webhook_received',
  });
}

/**
 * Loga uma criação automática de conta
 */
export function logAutoAccountCreated(email: string) {
  log.info('Conta criada automaticamente', {
    email,
    event: 'auto_account_created',
  });
}

/**
 * Loga detecção de pedido duplicado (idempotência)
 */
export function logDuplicateOrderDetected(orderId: string) {
  log.info('Pedido duplicado detectado (idempotência)', {
    orderId,
    event: 'duplicate_order_detected',
  });
}
