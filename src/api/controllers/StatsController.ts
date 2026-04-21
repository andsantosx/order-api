import { Request, Response } from 'express';
import { StatsService, StatsPeriod } from '../services/StatsService';
import { log } from '../../config/logger';
import { injectable, inject } from 'tsyringe';

/**
 * Controller para endpoints de estatísticas e métricas
 * Usado pelo painel administrativo
 */
@injectable()
export class StatsController {
  /**
   * GET /api/admin/stats
   * Retorna estatísticas gerais do sistema
   */
  async getOverview(req: Request, res: Response) {
    try {
      const stats = await this.statsService.getOverview();
      return res.json(stats);
    } catch (error) {
      log.error('Erro ao buscar estatísticas gerais', { error });
      throw error;
    }
  }

  /**
   * GET /api/admin/stats/sales?period=30d
   * Retorna vendas por período
   */
  async getSalesByPeriod(req: Request, res: Response) {
    try {
      const period = (req.query.period as StatsPeriod) || '30d';
      const sales = await this.statsService.getRevenueByPeriod(period);
      return res.json(sales);
    } catch (error) {
      log.error('Erro ao buscar vendas por período', { error });
      throw error;
    }
  }

  /**
   * GET /api/admin/stats/best-sellers?limit=10
   * Retorna produtos mais vendidos
   */
  async getBestSellers(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const period = (req.query.period as StatsPeriod) || '30d';
      const bestSellers = await this.statsService.getTopProducts(period, limit);
      return res.json(bestSellers);
    } catch (error) {
      log.error('Erro ao buscar produtos mais vendidos', { error });
      throw error;
    }
  }

  /**
   * GET /api/admin/stats/revenue?fromDate=...&toDate=...
   * Retorna estatísticas de receita (deprecated - usar getSalesByPeriod)
   */
  async getRevenueStats(req: Request, res: Response) {
    try {
      // Fallback para método antigo - recomendado usar period-based
      const period = (req.query.period as StatsPeriod) || '30d';
      const revenue = await this.statsService.getRevenueByPeriod(period);
      return res.json(revenue);
    } catch (error) {
      log.error('Erro ao buscar estatísticas de receita', { error });
      throw error;
    }
  }

  /**
   * GET /api/admin/stats/status-breakdown
   * Retorna distribuição de pedidos por status
   */
  async getStatusBreakdown(req: Request, res: Response) {
    try {
      const breakdown = await this.statsService.getOrderStatusBreakdown();
      return res.json(breakdown);
    } catch (error) {
      log.error('Erro ao buscar distribuição de status', { error });
      throw error;
    }
  }

  constructor(@inject(StatsService) private statsService: StatsService) {}
}
