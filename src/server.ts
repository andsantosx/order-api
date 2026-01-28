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
import adminRoutes from './api/routes/adminRoutes';
import profileRoutes from './api/routes/profileRoutes';

// Carrega variáveis de ambiente do arquivo .envs from './api/routes/adminRoutes';

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. Middlewares Iniciais
// ==========================================
// Habilita CORS para permitir requisições de outros domínios (Frontend)
app.use(cors());


// ==========================================
// 3. Middlewares Globais de JSON
// ==========================================
// Habilita parsing de JSON para todas as outras rotas
app.use(express.json());

// ==========================================
// 4. Rotas de Monitoramento (Health Check)
// ==========================================
// Rota simples para verificar se o servidor está online
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
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
app.use('/api/sizes', sizeRoutes);
console.log('✅ Size routes registered at /api/sizes');
app.use('/api/products', productRoutes);
console.log('✅ Product routes registered at /api/products');
app.use('/api/images', imageRoutes);
console.log('✅ Image routes registered at /api/images');

// Admin
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');

// Pedidos e Pagamentos
app.use('/api/orders', orderRoutes);
console.log('✅ Order routes registered at /api/orders');
app.use('/api/payments', paymentRoutes);
console.log('✅ Payment routes registered at /api/payments');

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
