import { container } from 'tsyringe';
import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const statsController = container.resolve(StatsController);

/**
 * Todas as rotas de estatísticas requerem autenticação
 */

// GET /api/admin/stats - Overview geral
router.get('/', authMiddleware, statsController.getOverview.bind(statsController));

// GET /api/admin/stats/sales?period=30d - Vendas por período
router.get('/sales', authMiddleware, statsController.getSalesByPeriod.bind(statsController));

// GET /api/admin/stats/best-sellers?limit=10&period=30d - Produtos mais vendidos
router.get('/best-sellers', authMiddleware, statsController.getBestSellers.bind(statsController));

// GET /api/admin/stats/revenue?period=30d - Receita (deprecated, usar /sales)
router.get('/revenue', authMiddleware, statsController.getRevenueStats.bind(statsController));

// GET /api/admin/stats/status-breakdown - Distribuição de status
router.get(
  '/status-breakdown',
  authMiddleware,
  statsController.getStatusBreakdown.bind(statsController),
);

export default router;
