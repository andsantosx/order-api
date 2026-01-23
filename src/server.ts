import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import productRoutes from './api/routes/productRoutes';
import orderRoutes from './api/routes/orderRoutes';
import paymentRoutes from './api/routes/paymentRoutes'; // Importa as rotas de pagamento

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---

// CORS para todas as rotas
app.use(cors());

// O webhook da Stripe precisa do corpo bruto (raw body), então o middleware de JSON
// deve ser aplicado depois da rota do webhook.
// Rota do Webhook (antes do express.json())
app.use('/api/payments', paymentRoutes);

// Middleware para parse de JSON para todas as outras rotas
app.use(express.json());


// --- Rotas da API ---
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);


// --- Rotas de Monitoramento e Fallback ---

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Tratamento de rota não encontrada (deve ser o último)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});


// --- Inicialização do Servidor ---

AppDataSource.initialize()
  .then(() => {
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
