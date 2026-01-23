import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import productRoutes from './api/routes/productRoutes';
import orderRoutes from './api/routes/orderRoutes'; // Importa as rotas de pedidos

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes); // Adiciona as rotas de pedidos

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Tratamento de rota não encontrada
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Iniciar servidor e conexão com o banco
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error('❌ Erro ao inicializar o servidor:', error);
  });

export default app;
