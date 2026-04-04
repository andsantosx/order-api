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
  address?: {
    zip_code?: string;
    street_name?: string;
    street_number?: string;
    city_name?: string;
    state_id?: string;
  };
  phone?: {
    area_code?: string;
    number?: string;
  };
}

/**
 * Item da compra
 */
export interface PaymentItem {
  id: string;
  title: string;
  description?: string;
  category_id?: string;
  quantity: number;
  unit_price: number;
}

/**
 * Dados completos de um pagamento
 */
export interface PaymentRequestData {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  external_reference?: string;
  notification_url?: string;
  payer: PayerData;
  additional_info?: {
    items: PaymentItem[];
    payer?: Partial<PayerData>;
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  installments?: number;
  token?: string;
  issuer_id?: number;
  metadata?: {
    order_id: string;
  };
  // Campo usado pelo frontend que pode conter dados adicionais
  formData?: any;
}

/**
 * Estrutura de erro do Mercado Pago
 */
export interface MercadoPagoError extends Error {
  status?: number;
  cause?: string | object;
}

/**
 * Query parameters do webhook
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
