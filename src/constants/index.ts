/**
 * Constantes globais da aplicação
 * Centraliza valores mágicos e configurações reutilizáveis
 */

/**
 * Configurações de Segurança
 */
export const SECURITY = {
  /** Número de rounds do algoritmo bcrypt para hash de senhas */
  BCRYPT_SALT_ROUNDS: 10,

  /** Tempo de expiração do token JWT */
  JWT_EXPIRATION: '1d',

  /** Tamanho mínimo da senha do usuário */
  MIN_PASSWORD_LENGTH: 6,

  /** Tamanho mínimo do JWT_SECRET */
  MIN_JWT_SECRET_LENGTH: 32,
} as const;

/**
 * Configurações Monetárias
 */
export const MONEY = {
  /** Centavos por real (100 centavos = 1 real) */
  CENTS_PER_REAL: 100,

  /** Moeda padrão do sistema */
  DEFAULT_CURRENCY: 'BRL',

  /** Valor mínimo de pedido em centavos (R$ 10,00) */
  MIN_ORDER_VALUE_CENTS: 1000,

  /** Valor máximo de pedido em centavos (R$ 50.000,00) */
  MAX_ORDER_VALUE_CENTS: 5000000,
} as const;

/**
 * Configurações de Pedidos
 */
export const ORDER = {
  /** Janela de tempo (em segundos) para detecção de pedidos duplicados */
  IDEMPOTENCY_WINDOW_SECONDS: 30,

  /** Moeda padrão para pedidos */
  DEFAULT_CURRENCY: 'BRL',

  /** Quantidade mínima de um item no pedido */
  MIN_ITEM_QUANTITY: 1,

  /** Quantidade máxima de um item no pedido */
  MAX_ITEM_QUANTITY: 99,

  /** Número máximo de itens diferentes em um pedido */
  MAX_ITEMS_PER_ORDER: 50,
} as const;

/**
 * Configurações de Frete
 */
export const SHIPPING = {
  /** Valor fixo de frete em centavos (R$ 15,00) */
  FIXED_SHIPPING_COST_CENTS: 1500,

  /** Valor mínimo para frete grátis em centavos (R$ 200,00) */
  FREE_SHIPPING_THRESHOLD_CENTS: 20000,

  /** Prazo estimado de entrega em dias úteis */
  ESTIMATED_DELIVERY_DAYS: 7,
} as const;

/**
 * Configurações de Email
 */
export const EMAIL = {
  /** Assunto do email de auto-signup */
  AUTO_SIGNUP_SUBJECT: 'Sua conta foi criada - Credenciais de acesso',

  /** Assunto do email de confirmação de pedido */
  ORDER_CONFIRMATION_SUBJECT: 'Pedido confirmado',

  /** Assunto do email de pedido enviado */
  ORDER_SHIPPED_SUBJECT: 'Seu pedido foi enviado',
} as const;

/**
 * Configurações de Paginação
 */
export const PAGINATION = {
  /** Limite padrão de itens por página */
  DEFAULT_LIMIT: 20,

  /** Limite máximo de itens por página */
  MAX_LIMIT: 100,

  /** Página padrão (primeira página) */
  DEFAULT_PAGE: 1,
} as const;

/**
 * Configurações de Validação
 */
export const VALIDATION = {
  // Usuário
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,

  // CPF
  CPF_LENGTH: 11,
  CPF_REGEX: /^\d{11}$/,
  CPF_FORMATTED_REGEX: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,

  // Telefone (Formato Brasileiro)
  PHONE_MIN_LENGTH: 10, // (99) 9999-9999
  PHONE_MAX_LENGTH: 11, // (99) 99999-9999
  PHONE_REGEX: /^\d{10,11}$/,

  // Produto
  PRODUCT_NAME_MIN_LENGTH: 3,
  PRODUCT_NAME_MAX_LENGTH: 255,
  PRODUCT_DESCRIPTION_MAX_LENGTH: 1000,
  PRODUCT_PRICE_MIN: 0,
  PRODUCT_PRICE_MAX: 1000000000, // R$ 10 milhões em centavos

  // Endereço
  ZIP_CODE_REGEX: /^\d{5}-?\d{3}$/,
  MIN_STREET_LENGTH: 5,
  MAX_STREET_LENGTH: 255,
  MIN_CITY_LENGTH: 2,
  MAX_CITY_LENGTH: 100,
  STATE_LENGTH: 2,
  MAX_ADDRESS_COMPLEMENT_LENGTH: 100,
  MAX_ADDRESS_NUMBER_LENGTH: 20,

  // Contato
  SUBJECT_MIN_LENGTH: 3,
  SUBJECT_MAX_LENGTH: 100,
  MESSAGE_MIN_LENGTH: 10,
  MESSAGE_MAX_LENGTH: 2000,

  // Pedido
  MIN_ORDER_ITEMS: 1,
  MAX_ORDER_ITEMS: 50,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 100,

  // Generic (backward compatibility)
  MAX_NAME_LENGTH: 255, // Mantido por retrocompatibilidade se necessário
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_ADDRESS_LENGTH: 255,
} as const;

/**
 * Labels em português para status de pedidos
 * Usado para exibição ao usuário e admin
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  PROCESSING: 'Processando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
  REFUNDED: 'Reembolsado',
} as const;

/**
 * Labels em português para status de pagamento
 * Mapeamento dos status do Mercado Pago
 */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  authorized: 'Autorizado',
  in_process: 'Em Processamento',
  in_mediation: 'Em Mediação',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Estornado',
} as const;

/**
 * Status HTTP comuns
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Mensagens de erro padrão
 */
export const ERROR_MESSAGES = {
  // Autenticação
  NO_TOKEN: 'Token de autenticação não fornecido',
  MALFORMED_TOKEN: 'Token mal formatado',
  INVALID_TOKEN: 'Token inválido ou expirado',
  INVALID_CREDENTIALS: 'Email ou senha inválidos',

  // Usuário
  USER_EXISTS: 'Usuário já existe',
  USER_NOT_FOUND: 'Usuário não encontrado',
  EMAIL_IN_USE: 'Email já está em uso',

  // Pedido
  ORDER_NOT_FOUND: 'Pedido não encontrado',
  ORDER_UNAUTHORIZED: 'Você não tem permissão para acessar este pedido',
  ZIPCODE_REQUIRED: 'CEP é obrigatório para o envio',
  ORDER_TOO_SMALL: 'Valor mínimo do pedido não atingido',
  ORDER_TOO_LARGE: 'Valor máximo do pedido excedido',
  TOO_MANY_ITEMS: 'Número máximo de itens no pedido excedido',
  INVALID_QUANTITY: 'Quantidade inválida',

  // Produto
  PRODUCT_NOT_FOUND: 'Produto não encontrado',
  INVALID_IMAGE_URL: 'URL de imagem inválida',
  IMAGE_DOMAIN_NOT_ALLOWED: 'Domínio de imagem não autorizado',

  // Categoria
  CATEGORY_NOT_FOUND: 'Categoria não encontrada',

  // Marca
  BRAND_NOT_FOUND: 'Marca não encontrada',

  // Pagamento
  PAYMENT_FAILED: 'Falha ao processar pagamento',
  REFUND_FAILED: 'Falha ao processar reembolso',

  // Validação
  INVALID_INPUT: 'Dados de entrada inválidos',
  INVALID_ZIPCODE: 'CEP inválido',
  INVALID_CPF: 'CPF inválido',
  TERMS_NOT_ACCEPTED: 'Você deve aceitar os termos e condições para continuar.',

  // Genérico
  INTERNAL_ERROR: 'Erro interno do servidor',
} as const;
