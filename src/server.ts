import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// GET - Listar produtos
app.get('/api/products', (req: Request, res: Response) => {
  const products = [
    {
      id: 1,
      name: 'Notebook',
      price: 2500.00,
      description: 'Notebook de alto desempenho',
      stock: 5,
    },
    {
      id: 2,
      name: 'Mouse',
      price: 50.00,
      description: 'Mouse sem fio',
      stock: 20,
    },
    {
      id: 3,
      name: 'Teclado',
      price: 150.00,
      description: 'Teclado mecânico',
      stock: 10,
    },
  ];

  res.status(200).json({
    success: true,
    data: products,
    total: products.length,
  });
});

// GET - Detalhes do produto
app.get('/api/products/:id', (req: Request, res: Response): void => {
  const { id } = req.params;

  const product = {
    id: parseInt(id as string),
    name: 'Notebook',
    price: 2500.00,
    description: 'Notebook de alto desempenho com processador i7',
    stock: 5,
    category: 'Eletrônicos',
    rating: 4.5,
    reviews: 128,
  };

  res.status(200).json({
    success: true,
    data: product,
  });
});

// POST - Criar pedido
app.post('/api/orders', (req: Request, res: Response): void => {
  const { customerName, items, totalPrice } = req.body;

  if (!customerName || !items || !totalPrice) {
    res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
    return;
  }

  const order = {
    id: Math.floor(Math.random() * 10000),
    customerName,
    items: Array.isArray(items) ? items : [items],
    totalPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order,
  });
});

// GET - Listar pedidos
app.get('/api/orders', (req: Request, res: Response) => {
  const orders = [
    {
      id: 1001,
      customerName: 'João Silva',
      totalPrice: 2650.00,
      status: 'completed',
      createdAt: '2025-01-20T10:30:00Z',
    },
    {
      id: 1002,
      customerName: 'Maria Santos',
      totalPrice: 200.00,
      status: 'pending',
      createdAt: '2025-01-21T08:15:00Z',
    },
  ];

  res.status(200).json({
    success: true,
    data: orders,
    total: orders.length,
  });
});

// Tratamento de rota não encontrada
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app;
