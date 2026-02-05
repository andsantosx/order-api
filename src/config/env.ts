import dotenv from 'dotenv';
import { NodeEnvironment } from '../types/system';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Interface que define todas as variáveis de ambiente obrigatórias e opcionais
 */
interface EnvironmentConfig {
    // Banco de Dados
    DATABASE_URL: string;

    // Autenticação e Segurança
    JWT_SECRET: string;

    // Servidor
    PORT: number;
    NODE_ENV: 'development' | 'production' | 'test';
    FRONTEND_URL: string;

    // Mercado Pago
    MERCADOPAGO_ACCESS_TOKEN: string;

    // Rate Limiting (opcional - usa defaults se não configurado)
    RATE_LIMIT_WINDOW_MS?: number;
    RATE_LIMIT_MAX?: number;
    AUTH_RATE_LIMIT_WINDOW_MS?: number;
    AUTH_RATE_LIMIT_MAX?: number;
    ORDER_RATE_LIMIT_WINDOW_MS?: number;
    ORDER_RATE_LIMIT_MAX?: number;
    PAYMENT_RATE_LIMIT_WINDOW_MS?: number;
    PAYMENT_RATE_LIMIT_MAX?: number;
}

/**
 * Validação de variáveis de ambiente obrigatórias
 * Lança erro se alguma variável crítica estiver faltando
 */
function validateEnvironment(): EnvironmentConfig {
    const required = [
        'DATABASE_URL',
        'JWT_SECRET',
        'MERCADOPAGO_ACCESS_TOKEN'
    ];

    const missing: string[] = [];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `❌ Variáveis de ambiente obrigatórias não configuradas:\n${missing.map(k => `  - ${k}`).join('\n')}\n\n` +
            `Por favor, configure estas variáveis no arquivo .env antes de iniciar o servidor.`
        );
    }

    // Validação específica do JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
        throw new Error(
            `❌ JWT_SECRET deve ter pelo menos 32 caracteres para segurança adequada.\n` +
            `Tamanho atual: ${jwtSecret.length} caracteres.`
        );
    }

    return {
        DATABASE_URL: process.env.DATABASE_URL!,
        JWT_SECRET: jwtSecret,
        PORT: parseInt(process.env.PORT || '3000', 10),
        NODE_ENV: (process.env.NODE_ENV as NodeEnvironment) || 'development',
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
        MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN!,
        
        // Rate Limiting (opcionais)
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_GENERAL_WINDOW 
            ? parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW, 10) 
            : undefined,
        RATE_LIMIT_MAX: process.env.RATE_LIMIT_GENERAL_MAX 
            ? parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) 
            : undefined,
        AUTH_RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_AUTH_WINDOW 
            ? parseInt(process.env.RATE_LIMIT_AUTH_WINDOW, 10) 
            : undefined,
        AUTH_RATE_LIMIT_MAX: process.env.RATE_LIMIT_AUTH_MAX 
            ? parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) 
            : undefined,
        ORDER_RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_ORDER_WINDOW 
            ? parseInt(process.env.RATE_LIMIT_ORDER_WINDOW, 10) 
            : undefined,
        ORDER_RATE_LIMIT_MAX: process.env.RATE_LIMIT_ORDER_MAX 
            ? parseInt(process.env.RATE_LIMIT_ORDER_MAX, 10) 
            : undefined,
        PAYMENT_RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_PAYMENT_WINDOW 
            ? parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW, 10) 
            : undefined,
        PAYMENT_RATE_LIMIT_MAX: process.env.RATE_LIMIT_PAYMENT_MAX 
            ? parseInt(process.env.RATE_LIMIT_PAYMENT_MAX, 10) 
            : undefined,
    };
}

/**
 * Configuração validada e exportada
 * Falha na inicialização se variáveis críticas estiverem faltando
 */
export const env = validateEnvironment();

/**
 * Helper para verificar se estamos em ambiente de produção
 */
export const isProduction = (): boolean => env.NODE_ENV === 'production';

/**
 * Helper para verificar se estamos em ambiente de desenvolvimento
 */
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';

/**
 * Helper para verificar se estamos em ambiente de teste
 */
export const isTest = (): boolean => env.NODE_ENV === 'test';
