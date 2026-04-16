/**
 * @file src/types/payment.ts
 * Tipos para integração com o Mercado Pago.
 */
import { MercadoPagoPaymentStatus, MercadoPagoStatusDetail } from './domain-enums';
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
  transactionAmount?: number;
  transaction_amount?: number;
  description: string;
  paymentMethodId?: string;
  payment_method_id?: string;
  externalReference?: string;
  external_reference?: string;
  orderId?: string;
  notificationUrl?: string;
  notification_url?: string;
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
  issuer_id?: number | string;
  metadata?: {
    orderId: string;
    deviceId?: string;
    device_id?: string;
  };
  deviceId?: string; // Root device identification
  device_id?: string;
  statementDescriptor?: string; // Text on customer credit card statement
  statement_descriptor?: string;
  binaryMode?: boolean; // Instant results
  binary_mode?: boolean;
  // Campo usado pelo frontend que pode conter dados adicionais
  formData?: PaymentFormData;
}

/**
 * Dados que vem do Brick de Pagamento do Frontend
 */
export interface PaymentFormData {
  paymentMethodId?: string;
  payment_method_id?: string;
  token?: string;
  installments?: number;
  issuerId?: number;
  issuer_id?: number | string;
  deviceId?: string;
  device_id?: string;
  payer?: {
    email?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
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
      city?: string;
      state_name?: string;
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
        city?: string;
        state_name?: string;
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
 * Resposta padrão de criação de pagamento do Mercado Pago.
 * Tipada com os enums de domínio para garantir segurança de tipos.
 */
export interface MercadoPagoPaymentResponse {
  id: number;
  status: MercadoPagoPaymentStatus;
  status_detail: MercadoPagoStatusDetail;
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
      external_resource_url?: string;
    };
  };
  date_of_expiration?: string;
  card?: {
    last_four_digits?: string;
    first_six_digits?: string;
    expiration_month?: number;
    expiration_year?: number;
  };
}
