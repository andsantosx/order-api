import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import productRoutes from './api/routes/productRoutes';
import orderRoutes from './api/routes/orderRoutes';
import paymentRoutes from './api/routes/paymentRoutes';
import { PaymentController } from './api/controllers/PaymentController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());

// --- Rota de Webhook da Stripe (Tratamento Especial) ---
// Esta rota DEVE vir ANTES do express.json(), pois a Stripe precisa do corpo bruto (raw body).
const paymentController = new PaymentController();
app.post(
  '/api/payments/webhook',
  // Use express.raw para obter o corpo como um Buffer
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook.bind(paymentController)
);

// --- Middlewares Globais ---
// Middleware para parse de JSON para todas as outras rotas.
// Ele deve vir DEPOIS da rota de webhook.
app.use(express.json());

// --- Rotas da API ---
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes); // Agora contém apenas /create-intent

// --- Rotas de Monitoramento e Fallback ---
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

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
