import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());

// --- Rota de Webhook da Stripe (Tratamento Especial) ---
const paymentController = new PaymentController();
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

// --- Middlewares Globais ---
app.use(express.json());

// --- Rotas da API ---
console.log('🔧 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered at /api/auth');
app.use('/api/categories', categoryRoutes);
console.log('✅ Category routes registered at /api/categories');
app.use('/api/sizes', sizeRoutes);
console.log('✅ Size routes registered at /api/sizes');
app.use('/api/products', productRoutes);
console.log('✅ Product routes registered at /api/products');
app.use('/api/images', imageRoutes);
console.log('✅ Image routes registered at /api/images');
app.use('/api/orders', orderRoutes);
console.log('✅ Order routes registered at /api/orders');
app.use('/api/payments', paymentRoutes);
console.log('✅ Payment routes registered at /api/payments');

// --- Rotas de Monitoramento e Fallback ---
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Middleware Global de Erros DEVE vir depois das rotas
app.use(errorHandler);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// --- Inicialização do Servidor ---
AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error('❌ Erro ao inicializar o servidor:', error);
  });

export default app;
