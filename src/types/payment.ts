/**
 * Dados do pagador
 */
export interface PayerData {
  email: string;
  firstName: string;
  lastName: string;
  identification: {
    type: string;
    number: string;
  };
  address?: {
    zipCode?: string;
    streetName?: string;
    streetNumber?: string;
    cityName?: string;
    stateId?: string;
  };
  phone?: {
    areaCode?: string;
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
  categoryId?: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Item no formato do Mercado Pago (snake_case)
 */
export interface MercadoPagoItem {
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
  transactionAmount: number;
  description: string;
  paymentMethodId: string;
  externalReference?: string;
  notificationUrl?: string;
  payer: PayerData;
  additionalInfo?: {
    items: PaymentItem[];
    payer?: Partial<PayerData>;
  };
  backUrls?: {
    success: string;
    failure: string;
    pending: string;
  };
  autoReturn?: 'approved' | 'all';
  installments?: number;
  token?: string;
  issuerId?: number;
  metadata?: {
    orderId: string;
    deviceId?: string;
  };
  deviceId?: string; // Root device identification
  statementDescriptor?: string; // Text on customer credit card statement
  binaryMode?: boolean; // Instant results
  // Campo usado pelo frontend que pode conter dados adicionais
  formData?: PaymentFormData;
}

/**
 * Dados que vem do Brick de Pagamento do Frontend
 */
export interface PaymentFormData {
  paymentMethodId: string;
  token?: string;
  installments?: number;
  issuerId?: number;
  deviceId?: string;
  payer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

/**
 * Estrutura exata enviada para a API do Mercado Pago
 */
export interface PaymentRequestBody {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  external_reference?: string;
  notification_url?: string;
  statement_descriptor?: string;
  binary_mode?: boolean;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    identification: {
      type: string;
      number: string;
    };
    phone?: {
      area_code: string;
      number: string;
    };
    address?: {
      zip_code: string;
      street_name: string;
      street_number: string;
    };
  };
  additional_info?: {
    items: MercadoPagoItem[];
    payer?: {
      first_name: string;
      last_name: string;
      registration_date: string;
      phone?: {
        area_code: string;
        number: string;
      };
      address?: {
        zip_code: string;
        street_name: string;
        street_number: string;
      };
    };
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  metadata?: {
    order_id: string;
    device_id: string;
  };
  installments?: number;
  token?: string;
  issuer_id?: number;
  device_id?: string;
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

/**
 * Resposta padrão de criação de pagamento do Mercado Pago
 */
export interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  date_approved?: string | null;
  payer?: PayerData;
  payment_method_id?: string;
  transaction_amount?: number;
  installments?: number;
  metadata?: Record<string, unknown>;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  date_of_expiration?: string;
}
