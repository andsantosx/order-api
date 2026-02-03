import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const statsController = new StatsController();

// All stats routes require admin authentication
// Admin middleware should check req.user?.isAdmin

/**
 * GET /api/admin/stats/overview
 * Overview statistics: total revenue, orders, etc
 */
router.get('/overview', authMiddleware, statsController.getOverview.bind(statsController));

/**
 * GET /api/admin/stats/sales?period=7days
 * Sales data by period (7days, 30days, 90days, year)
 */
router.get('/sales', authMiddleware, statsController.getSales.bind(statsController));

/**
 * GET /api/admin/stats/best-sellers?limit=10
 * Best selling products
 */
router.get('/best-sellers', authMiddleware, statsController.getBestSellers.bind(statsController));

/**
 * GET /api/admin/stats/revenue?from=2026-01-01&to=2026-01-31
 * Revenue statistics with optional date range
 */
router.get('/revenue', authMiddleware, statsController.getRevenue.bind(statsController));

/**
 * GET /api/admin/stats/order-status
 * Order status breakdown
 */
router.get('/order-status', authMiddleware, statsController.getOrderStatus.bind(statsController));

export default router;
