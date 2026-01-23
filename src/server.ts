import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import productRoutes from './api/routes/productRoutes';
import orderRoutes from './api/routes/orderRoutes';
import paymentRoutes from './api/routes/paymentRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use('/api/payments', paymentRoutes);
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

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

AppDataSource.initialize()
  .then(async () => { // Adicionado async aqui
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');

    // --- CÓDIGO DE DIAGNÓSTICO TEMPORÁRIO ---
    try {
      console.log('🔍 Executando diagnóstico de tabelas...');
      const queryRunner = AppDataSource.createQueryRunner();
      const result = await queryRunner.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      console.log('✅ Tabelas encontradas no schema "public":', result.map((t: any) => t.table_name));
      await queryRunner.release();
    } catch (diagError) {
      console.error('❌ Erro durante o diagnóstico de tabelas:', diagError);
    }
    // --- FIM DO CÓDIGO DE DIAGNÓSTICO ---

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
