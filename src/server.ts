import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import productRoutes from './api/routes/productRoutes';
import orderRoutes from './api/routes/orderRoutes';
import paymentRoutes from './api/routes/paymentRoutes';
import authRoutes from './api/routes/authRoutes';
import categoryRoutes from './api/routes/categoryRoutes';
import sizeRoutes from './api/routes/sizeRoutes';
import imageRoutes from './api/routes/imageRoutes';
import { PaymentController } from './api/controllers/PaymentController';
import { errorHandler } from './api/middlewares/errorHandler';
import adminRoutes from './api/routes/adminRoutes';
import profileRoutes from './api/routes/profileRoutes';
import contactRoutes from './api/routes/contactRoutes';
import brandRoutes from './api/routes/brandRoutes';
import statsRoutes from './api/routes/statsRoutes';
import { log } from './config/logger';
import { requestLogger } from './api/middlewares/requestLogger';
import { generalLimiter } from './config/rateLimits';
import { env, isProduction } from './config/env'; // Valida variáveis de ambiente na importação

// Carrega variáveis de ambiente do arquivo .envs from './api/routes/adminRoutes';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const PORT = env.PORT;

// ==========================================
// 1. Middlewares Iniciais
// ==========================================

// Trust proxy (necessário quando atrás de nginx/load balancer)
// Permite que o rate limiter identifique IPs corretamente via X-Forwarded-For
app.set('trust proxy', 1);

// Request logging
app.use(requestLogger);

// Security headers
app.use(helmet());

// General rate limiting (baseline protection)
app.use('/api', generalLimiter);

// CORS - apenas frontend autorizado
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// ==========================================
// 3. Middlewares Globais de JSON
// ==========================================
// Habilita parsing de JSON para todas as outras rotas
app.use(express.json());

// ==========================================
// 4. Rotas de Monitoramento (Health Check)
// ==========================================
// Enhanced health check with database and external services status
app.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthcheck = {
    status: 'ok' as 'ok' | 'degraded' | 'down',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    checks: {
      database: { status: 'unknown' as 'ok' | 'error', responseTime: '0ms' },
      mercadopago: { status: 'unknown' as 'ok' | 'error', responseTime: '0ms' }
    }
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await AppDataSource.query('SELECT 1');
    healthcheck.checks.database = {
      status: 'ok',
      responseTime: `${Date.now() - dbStart}ms`
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
      signal: AbortSignal.timeout(3000) // 3s timeout
    });
    healthcheck.checks.mercadopago = {
      status: response.ok ? 'ok' : 'error',
      responseTime: `${Date.now() - mpStart}ms`
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
// 5. Registro de Rotas da API
// ==========================================
console.log('🔧 Registering routes...');

// Autenticação (Login, Cadastro)
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered at /api/auth');

// Perfil (Endereços)
app.use('/api/profile', profileRoutes);
console.log('✅ Profile routes registered at /api/profile');

// Catálogo (Categorias, Tamanhos, Produtos, Imagens)
app.use('/api/categories', categoryRoutes);
console.log('✅ Category routes registered at /api/categories');
app.use('/api/brands', brandRoutes);
console.log('✅ Brand routes registered at /api/brands');
app.use('/api/sizes', sizeRoutes);
console.log('✅ Size routes registered at /api/sizes');
app.use('/api/products', productRoutes);
console.log('✅ Product routes registered at /api/products');
app.use('/api/images', imageRoutes);
console.log('✅ Image routes registered at /api/images');

// Admin Panel
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');

// Admin Statistics
app.use('/api/admin/stats', statsRoutes);
console.log('✅ Stats routes registered at /api/admin/stats');

// Pedidos e Pagamentos
app.use('/api/orders', orderRoutes);
console.log('✅ Order routes registered at /api/orders');
app.use('/api/payments', paymentRoutes);
console.log('✅ Payment routes registered at /api/payments');

// Contato
app.use('/api/contact', contactRoutes);
console.log('✅ Contact routes registered at /api/contact');

// ==========================================
// 6. Tratamento de Erros e 404
// ==========================================

// Middleware Global de Erros (Captura erros lançados em qualquer rota)
// Deve ser sempre o PENÚLTIMO middleware
app.use(errorHandler);

// Middleware 404 (Rota não encontrada)
// Deve ser sempre o ÚLTIMO middleware
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ==========================================
// 7. Inicialização do Servidor
// ==========================================
// Primeiro conecta ao banco de dados, depois inicia o servidor HTTP
AppDataSource.initialize()
  .then(async () => {
    log.info('Conexão com o banco de dados estabelecida com sucesso');
    app.listen(PORT, () => {
      log.info(`Server running on port ${PORT}`);
      log.info(`Environment: ${env.NODE_ENV}`);
      log.info(`Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    log.error('Erro ao inicializar o servidor', { error: error.message });
    process.exit(1); // Encerra o processo em caso de erro crítico
  });

export default app;
