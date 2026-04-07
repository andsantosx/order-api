/**
 * @file src/types/domain-enums.ts
 *
 * Enums centralizados do domínio da aplicação.
 *
 * Princípio: Nenhuma string mágica no código de negócio.
 * Todos os valores que representam estados, papéis ou eventos
 * devem ser expressos via Enum — garantindo type-safety,
 * autocompletion e rastreabilidade em toda a codebase.
 */

// ============================================================
// Pagamentos — Mercado Pago
// ============================================================

/**
 * Status oficiais retornados pela API do Mercado Pago.
 * Referência: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/response-handling/collection-results
 */
export enum MercadoPagoPaymentStatus {
  APPROVED    = 'approved',
  PENDING     = 'pending',
  AUTHORIZED  = 'authorized',
  IN_PROCESS  = 'in_process',
  IN_MEDIATION = 'in_mediation',
  REJECTED    = 'rejected',
  CANCELLED   = 'cancelled',
  REFUNDED    = 'refunded',
  CHARGED_BACK = 'charged_back',
}

/**
 * Status detail do Mercado Pago que indica o motivo da rejeição.
 * Usado para mensagens amigáveis ao usuário.
 */
export enum MercadoPagoStatusDetail {
  // Sucesso
  ACCREDITED                           = 'accredited',
  // Pendência
  PENDING_CONTINGENCY                  = 'pending_contingency',
  PENDING_REVIEW_MANUAL                = 'pending_review_manual',
  PENDING_WAITING_TRANSFER             = 'pending_waiting_transfer',
  PENDING_WAITING_PAYMENT              = 'pending_waiting_payment',
  IN_PROCESS                           = 'in_process',
  // Rejeição
  CC_REJECTED_INSUFFICIENT_AMOUNT      = 'cc_rejected_insufficient_amount',
  CC_REJECTED_HIGH_RISK                = 'cc_rejected_high_risk',
  CC_REJECTED_BAD_FILLED_CARD_NUMBER   = 'cc_rejected_bad_filled_card_number',
  CC_REJECTED_BAD_FILLED_DATE          = 'cc_rejected_bad_filled_date',
  CC_REJECTED_BAD_FILLED_SECURITY_CODE = 'cc_rejected_bad_filled_security_code',
  CC_REJECTED_BLACKLIST                = 'cc_rejected_blacklist',
  CC_REJECTED_CALL_FOR_AUTHORIZE       = 'cc_rejected_call_for_authorize',
  // Cancelamento / Estorno
  BY_MERCHANT                          = 'by_merchant',
  REFUNDED                             = 'refunded',
  CHARGED_BACK                         = 'charged_back',
}

// ============================================================
// Pedidos — Eventos de Domínio
// ============================================================

/**
 * Eventos de domínio do ciclo de vida do pedido.
 * Publicados via DomainEvents e consumidos por Subscribers (Socket, Email, etc).
 */
export enum OrderDomainEvent {
  ORDER_CREATED           = 'ORDER_CREATED',
  PAYMENT_PENDING         = 'PAYMENT_PENDING',
  PAYMENT_APPROVED        = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED        = 'PAYMENT_REJECTED',
  ORDER_AWAITING_SHIPMENT = 'ORDER_AWAITING_SHIPMENT',
  ORDER_SHIPPED           = 'ORDER_SHIPPED',
  ORDER_DELIVERED         = 'ORDER_DELIVERED',
  ORDER_CANCELLED         = 'ORDER_CANCELLED',
  ORDER_REFUNDED          = 'ORDER_REFUNDED',
}

// ============================================================
// Rastreabilidade — Quem alterou o status
// ============================================================

/**
 * Papel de quem realizou a mudança de status do pedido.
 * Gravado no OrderStatusHistory para auditoria e rastreabilidade completa.
 */
export enum ChangedByRole {
  USER            = 'USER',
  ADMIN           = 'ADMIN',
  SYSTEM          = 'SYSTEM',
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY',
}

// ============================================================
// Status de Contato
// ============================================================

/**
 * Nomes dos status de contato para uso nas constantes.
 * Os IDs (101, 102, 103) estão no enum ContactMessageStatus na entidade.
 */
export enum ContactStatusName {
  PENDING = 'PENDING',
  REPLIED = 'REPLIED',
  CLOSED  = 'CLOSED',
}
