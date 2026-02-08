import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Define o esquema de validação com Zod
const envSchema = z.object({
  // Banco de Dados
  DATABASE_URL: z.string().url(),

  // Autenticação e Segurança
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),

  // Servidor
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Mercado Pago
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1, 'Mercado Pago Access Token é obrigatório'),

  // Rate Limiting (opcional)
  RATE_LIMIT_GENERAL_WINDOW: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d+$/))
    .transform(Number)
    .optional(),
  RATE_LIMIT_GENERAL_MAX: z.string().regex(/^\d+$/).transform(Number).optional(),

  RATE_LIMIT_AUTH_WINDOW: z.string().regex(/^\d+$/).transform(Number).optional(),
  RATE_LIMIT_AUTH_MAX: z.string().regex(/^\d+$/).transform(Number).optional(),

  RATE_LIMIT_ORDER_WINDOW: z.string().regex(/^\d+$/).transform(Number).optional(),
  RATE_LIMIT_ORDER_MAX: z.string().regex(/^\d+$/).transform(Number).optional(),

  RATE_LIMIT_PAYMENT_WINDOW: z.string().regex(/^\d+$/).transform(Number).optional(),
  RATE_LIMIT_PAYMENT_MAX: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Valida as variáveis de ambiente
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Variáveis de ambiente inválidas:', _env.error.format());
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = _env.data;

/**
 * Helpers
 */
export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';
export const isTest = (): boolean => env.NODE_ENV === 'test';
