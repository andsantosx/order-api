import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/StatsService';

export class StatsController {
    private statsService = new StatsService();

    /**
     * GET /api/admin/stats/overview
     * Get overview statistics (total revenue, orders, etc)
     */
    async getOverview(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await this.statsService.getOverview();
            res.json(stats);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/stats/sales?period=7days
     * Get sales data by period
     */
    async getSales(req: Request, res: Response, next: NextFunction) {
        try {
            const period = (req.query.period as string) || '30days';
            const validPeriods = ['7days', '30days', '90days', 'year'];

            if (!validPeriods.includes(period)) {
                return res.status(400).json({ error: 'Invalid period. Use: 7days, 30days, 90days, or year' });
            }

            const sales = await this.statsService.getSalesByPeriod(period as any);
            res.json(sales);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/stats/best-sellers?limit=10
     * Get best selling products
     */
    async getBestSellers(req: Request, res: Response, next: NextFunction) {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const bestSellers = await this.statsService.getBestSellers(limit);
            res.json(bestSellers);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/stats/revenue?from=2026-01-01&to=2026-01-31
     * Get revenue statistics
     */
    async getRevenue(req: Request, res: Response, next: NextFunction) {
        try {
            const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
            const toDate = req.query.to ? new Date(req.query.to as string) : undefined;

            const revenue = await this.statsService.getRevenueStats(fromDate, toDate);
            res.json(revenue);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/stats/order-status
     * Get order status breakdown
     */
    async getOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const breakdown = await this.statsService.getOrderStatusBreakdown();
            res.json(breakdown);
        } catch (error) {
            next(error);
        }
    }
}
