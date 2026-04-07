import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Define o esquema de validação com Zod
const envSchema = z.object({
  // Banco de Dados (Exatamente como na imagem da Railway)
  DB_HOST: z.string().min(1, 'DB_HOST é obrigatório'),
  DB_NAME: z.string().min(1, 'DB_NAME é obrigatório'),
  DB_USER: z.string().min(1, 'DB_USER é obrigatório'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD é obrigatório'),
  DB_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .or(z.number())
    .default(5432),

  // Autenticação e Segurança
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),

  // Servidor
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .or(z.number())
    .default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Mercado Pago
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1, 'Mercado Pago Access Token é obrigatório'),
  MERCADOPAGO_PUBLIC_KEY: z.string().min(1, 'Mercado Pago Public Key é obrigatório'),
  MERCADOPAGO_WEBHOOK_SECRET: z
    .string()
    .min(1, 'Mercado Pago Webhook Secret é obrigatório')
    .default('default_secret_for_tests'),
  MERCADOPAGO_WEBHOOK_URL: z
    .string()
    .url('Mercado Pago Webhook URL inválida')
    .default('http://localhost:3000/api/payments/webhook'),

  // ReCAPTCHA (v2 Invisible)
  RECAPTCHA_SECRET_KEY: z.string().min(1, 'reCAPTCHA Secret Key é obrigatória'),

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
  ORDER_EXPIRATION_HOURS: z.string().regex(/^\d+$/).transform(Number).default(24),
  ORDER_EXPIRATION_CRON: z.string().default('0 */30 * * * *'),
});

// Valida as variáveis de ambiente (Eritamente o que está no process.env)
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
