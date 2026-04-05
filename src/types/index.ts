/**
 * Interfaces e tipos compartilhados pela aplicação
 */

/**
 * Payload do token JWT
 * Contém informações do usuário autenticado
 */
export interface JwtPayload {
  /** ID do usuário */
  userId: string;

  /** Email do usuário */
  email: string;

  /** Se o usuário é administrador */
  isAdmin: boolean;
}

/**
 * Dados de endereço de entrega
 */
export interface ShippingAddressData {
  /** Rua e número */
  street: string;

  /** Cidade */
  city: string;

  /** Estado (UF) */
  state: string;

  /** CEP (opcional para alguns casos) */
  zipCode?: string;

  /** País */
  country: string;
}

/**
 * Item de um pedido a ser criado
 */
export interface OrderItemInput {
  /** ID do produto */
  productId: string;

  /** Quantidade solicitada */
  quantity: number;

  /** Tamanho selecionado */
  size: number | string;
}

/**
 * Dados de entrada para criação de pedido
 */
export interface CreateOrderInput {
  /** ID do usuário (se autenticado) */
  userId?: string;

  /** Nome do cliente (para pedidos de visitantes) */
  guestName?: string;

  /** Email do cliente (para pedidos de visitantes) */
  guestEmail?: string;

  /** CPF do cliente */
  guestCpf?: string;

  /** Itens do pedido */
  items: OrderItemInput[];

  /** Endereço de entrega */
  shippingAddress: ShippingAddressData;
}

/**
 * Dados de pagamento do Mercado Pago
 */
export interface PaymentData {
  /** ID do método de pagamento */
  payment_method_id: string;

  /** Token do cartão (para cartões) */
  token?: string;

  /** Número de parcelas */
  installments?: number;

  /** ID do emissor do cartão */
  issuer_id?: string;

  /** Descrição do pagamento */
  description?: string;

  /** Dados do pagador */
  payer: {
    /** Email do pagador */
    email: string;

    /** Identificação do pagador */
    identification: {
      /** Tipo do documento (CPF, CNPJ, etc) */
      type: string;

      /** Número do documento */
      number: string;
    };

    /** Primeiro nome */
    first_name?: string;

    /** Sobrenome */
    last_name?: string;
  };
}

// Note: To avoid circular dependencies, we don't import specific types for relations
// These are loaded conditionally and not always present
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  document?: string;
  acceptedTerms: boolean;
}
