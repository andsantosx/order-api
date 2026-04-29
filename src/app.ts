import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';
import { AppDataSource } from './data-source';
import productRoutes from './api/routes/productRoutes';
import orderRoutes from './api/routes/orderRoutes';
import paymentRoutes from './api/routes/paymentRoutes';
import authRoutes from './api/routes/authRoutes';
import categoryRoutes from './api/routes/categoryRoutes';
import sizeRoutes from './api/routes/sizeRoutes';
import imageRoutes from './api/routes/imageRoutes';
import { errorHandler } from './api/middlewares/errorHandler';
import { sanitizationMiddleware } from './api/middlewares/sanitizationMiddleware';
import adminRoutes from './api/routes/adminRoutes';
import profileRoutes from './api/routes/profileRoutes';
import contactRoutes from './api/routes/contactRoutes';
import brandRoutes from './api/routes/brandRoutes';
import statsRoutes from './api/routes/statsRoutes';
import { log } from './config/logger';
import { requestLogger } from './api/middlewares/requestLogger';
import { generalLimiter } from './config/rateLimits';
import { env } from './config/env';
import shippingRoutes from './api/routes/shippingRoutes';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();

// ==========================================
// 1. Middlewares Iniciais
// ==========================================

// Trust proxy
app.set('trust proxy', 1);

// Request logging (Mantenha o mais alto possível para capturar tudo)
app.use(requestLogger);

// CORS - Deve vir ANTES do Rate Limiting para lidar com pre-flights adequadamente
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Security headers - Configured to allow Mercado Pago integration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          'https://sdk.mercadopago.com',
          'https://www.google.com/recaptcha/',
          'https://www.gstatic.com/recaptcha/',
        ],
        'connect-src': [
          "'self'",
          'https://api.mercadopago.com',
          'https://*.mercadopago.com',
          'https://*.mercadolibre.com',
          'https://www.google-analytics.com',
        ],
        'frame-src': [
          "'self'",
          'https://*.mercadopago.com',
          'https://*.mercadolibre.com',
          'https://www.google.com/recaptcha/',
        ],
        'img-src': ["'self'", 'data:', 'https://*.mlstatic.com', 'https://*.mercadopago.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
    },
    dnsPrefetchControl: { allow: true },
    frameguard: false, // Necessário para iframes do Mercado Pago (Seguro)
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  }),
);

// Global data sanitization
app.use(sanitizationMiddleware);

// General rate limiting (Apenas para as rotas /api)
app.use('/api', generalLimiter);

// ==========================================
// 2. Middlewares Globais de JSON
// ==========================================
app.use(express.json({ limit: '10kb' })); // Limit JSON body size to 10kb to prevent DoS
app.use(cookieParser()); // Parse cookies for httpOnly authentication

// ==========================================
// 3. Rotas de Monitoramento (Health Check)
// ==========================================
app.get('/health', async (req: Request, res: Response) => {
  const healthcheck = {
    status: 'ok' as 'ok' | 'degraded' | 'down',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    checks: {
      database: { status: 'unknown' as 'ok' | 'error', responseTime: '0ms' },
      mercadopago: { status: 'unknown' as 'ok' | 'error', responseTime: '0ms' },
    },
  };

  try {
    const dbStart = Date.now();
    await AppDataSource.query('SELECT 1');
    healthcheck.checks.database = {
      status: 'ok',
      responseTime: `${Date.now() - dbStart}ms`,
    };
  } catch (error) {
    healthcheck.checks.database = { status: 'error', responseTime: '0ms' };
    healthcheck.status = 'degraded';
    log.error('Database health check failed', { error });
  }

  // Check Mercado Pago (simple ping)
  try {
    const mpStart = Date.now();
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    healthcheck.checks.mercadopago = {
      status: response.ok ? 'ok' : 'error',
      responseTime: `${Date.now() - mpStart}ms`,
    };
    if (!response.ok) healthcheck.status = 'degraded';
  } catch (error) {
    healthcheck.checks.mercadopago = { status: 'error', responseTime: '0ms' };
    healthcheck.status = 'degraded';
    log.warn('Mercado Pago health check failed', { error });
  }

  const statusCode = healthcheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthcheck);
});

// ==========================================
// 4. Registro de Rotas da API
// ==========================================
log.info('🔧 Registering routes...');

// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
log.info('📄 Swagger docs available at /api-docs');

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/stats', statsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/shipping', shippingRoutes);

// ==========================================
// 5. Tratamento de Erros e 404
// ==========================================

// Middleware Global de Erros
app.use(errorHandler);

// Middleware 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default app;
