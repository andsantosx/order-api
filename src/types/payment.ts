/**
 * Tipos concretos para integração com Mercado Pago
 * Baseados na API real do Mercado Pago
 */

/**
 * Dados do pagador
 */
export interface PayerData {
    email: string;
    first_name: string;
    last_name: string;
    identification: {
        type: string;
        number: string;
    };
}

/**
 * Dados completos de um pagamento
 */
export interface PaymentRequestData {
    transaction_amount: number;
    description: string;
    payment_method_id: string;
    payer: PayerData;
    installments?: number;
    token?: string;
    issuer_id?: number;
    metadata?: {
        order_id: string;
    };
    // Campo usado pelo frontend que pode conter dados adicionais
    formData?: PaymentRequestData;
}

/**
 * Estrutura de erro do Mercado Pago
 */
export interface MercadoPagoError extends Error {
    status?: number;
    cause?: string | object;
}

/**
 * Query parameters do webhook (Express ParsedQs compatible)
 */
export interface WebhookQuery {
    id?: string;
    topic?: string;
    type?: string;
    'data.id'?: string;
}

/**
 * Body do webhook
 */
export interface WebhookBody {
    id?: string;
    type?: string;
    action?: string;
    data?: {
        id?: string;
    };
}

