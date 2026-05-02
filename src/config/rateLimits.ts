import rateLimit from 'express-rate-limit';
import { env } from './env';

/**
 * Configurações de Rate Limiting baseadas em variáveis de ambiente
 *
 * Protege contra abuso e ataques de força bruta
 * Cada limiter é aplicado em rotas específicas
 */

/**
 * Rate Limiter Geral
 * Aplicado em todas as rotas da API como baseline de proteção
 *
 * Limite padrão: 100 requisições por 15 minutos por IP
 * Configurável via RATE_LIMIT_WINDOW_MS e RATE_LIMIT_MAX
 */
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_GENERAL_WINDOW || 15 * 60 * 1000, // 15 minutos
  max: env.RATE_LIMIT_GENERAL_MAX || 100,
  message: {
    status: 'error',
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter para Autenticação (Login/Registro)
 *
 * Protege contra ataques de força bruta em credenciais
 * Limite padrão: 5 tentativas por 15 minutos por IP
 *
 * Aplicar em:
 * - POST /api/auth/login
 * - POST /api/auth/register
 */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW || 15 * 60 * 1000,
  max: env.RATE_LIMIT_AUTH_MAX || 5,
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
  message: {
    status: 'error',
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter para Criação de Pedidos
 *
 * Previne spam e abuso do sistema de pedidos
 * Limite padrão: 10 pedidos por hora por IP
 *
 * Aplicar em:
 * - POST /api/orders
 */
export const orderCreationLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_ORDER_WINDOW || 60 * 60 * 1000, // 1 hora
  max: env.RATE_LIMIT_ORDER_MAX || 10,
  message: {
    status: 'error',
    message: 'Limite de pedidos atingido. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Alias para compatibilidade com código existente
 */
export const orderLimiter = orderCreationLimiter;

/**
 * Rate Limiter para Processamento de Pagamentos
 *
 * Protege contra tentativas excessivas de pagamento
 * Limite padrão: 5 tentativas por 15 minutos por IP
 *
 * Aplicar em:
 * - POST /api/payments/:id
 */
export const paymentProcessingLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_PAYMENT_WINDOW || 15 * 60 * 1000,
  max: env.RATE_LIMIT_PAYMENT_MAX || 5,
  message: {
    status: 'error',
    message: 'Muitas tentativas de pagamento. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Alias para compatibilidade com código existente
 */
export const paymentLimiter = paymentProcessingLimiter;

/**
 * Rate Limiter para Webhooks
 *
 * Protege endpoint de webhook contra spam
 * Limite padrão: 100 webhooks por minuto
 *
 * Aplicar em:
 * - POST /api/payments/webhook
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: {
    status: 'error',
    message: 'Muitas requisições de webhook',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter para Busca de Produtos
 *
 * Previne scraping excessivo do catálogo
 * Limite padrão: 30 requisições por minuto por IP
 *
 * Aplicar em:
 * - GET /api/products
 */
export const productSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  message: {
    status: 'error',
    message: 'Muitas buscas. Aguarde antes de continuar.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter para Upload de Imagens
 *
 * Protege a cota do ImgBB (1000/mês na conta gratuita)
 * Limite padrão: 20 uploads por hora por IP (admin only)
 *
 * Aplicar em:
 * - POST /api/images/upload
 */
export const imageUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: {
    status: 'error',
    message: 'Limite de uploads de imagem atingido. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
