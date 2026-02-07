import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { In } from 'typeorm';
import { log } from '../../config/logger';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';

/**
 * Períodos válidos para estatísticas
 */
export type StatsPeriod = '7d' | '30d' | '90d' | 'year' | 'all';

/**
 * Service responsável por estatísticas e métricas do sistema
 *
 * Funcionalidades:
 * - Visão geral de vendas (receita, pedidos, status)
 * - Produtos mais vendidos por período
 * - Estatísticas de receita por período
 * - Validação de períodos e datas
 *
 * Todos os valores monetários são retornados em **centavos** para consistência
 */
export class StatsService {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private productRepository = AppDataSource.getRepository(Product);

  /**
   * Retorna estatísticas gerais do sistema
   *
   * Inclui:
   * - Receita total (apenas pedidos pagos/enviados/entregues)
   * - Receita dos últimos 30 dias
   * - Total de pedidos
   * - Pedidos pendentes
   * - Pedidos completados
   *
   * @returns Objeto com métricas gerais
   *
   * @example
   * const stats = await statsService.getOverview();
   * // {
   * //   totalRevenue: 1500000,      // R$ 15.000,00 em centavos
   * //   revenueLastMonth: 450000,   // R$ 4.500,00 em centavos
   * //   totalOrders: 125,
   * //   pendingOrders: 5,
   * //   completedOrders: 100
   * // }
   */
  async getOverview() {
    try {
      const [totalRevenue, totalOrders, pendingOrders, completedOrders] = await Promise.all([
        this.getTotalRevenue(),
        this.orderRepository.count(),
        this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
        this.orderRepository.count({
          where: { status: In([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]) },
        }),
      ]);

      // Last 30 days revenue
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRevenue = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total_amount)', 'total')
        .where('order.created_at >= :date', { date: thirtyDaysAgo })
        .andWhere('order.status IN (:...statuses)', {
          statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
        })
        .getRawOne();

      return {
        totalRevenue: totalRevenue || 0,
        revenueLastMonth: parseInt(recentRevenue?.total || '0', 10),
        totalOrders,
        pendingOrders,
        completedOrders,
      };
    } catch (error) {
      log.error('Erro ao buscar estatísticas gerais', { error });
      throw error;
    }
  }

  /**
   * Retorna a receita total do sistema
   *
   * Considera apenas pedidos completados (PAID, SHIPPED, DELIVERED)
   *
   * @returns Receita total em centavos
   */
  private async getTotalRevenue(): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total_amount)', 'total')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
      })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /**
   * Valida e converte período em data de início
   *
   * Períodos suportados:
   * - '7d': Últimos 7 dias
   * - '30d': Últimos 30 dias
   * - '90d': Últimos 90 dias
   * - 'year': Último ano
   * - 'all': Todos os registros
   *
   * @param period - Período desejado
   * @returns Data de início ou null (para 'all')
   * @throws AppError se período inválido
   */
  private getDateFromPeriod(period: StatsPeriod): Date | null {
    const now = new Date();

    switch (period) {
      case '7d':
        now.setDate(now.getDate() - 7);
        return now;
      case '30d':
        now.setDate(now.getDate() - 30);
        return now;
      case '90d':
        now.setDate(now.getDate() - 90);
        return now;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        return now;
      case 'all':
        return null;
      default:
        throw new AppError(
          `Período inválido: ${period}. Use: 7d, 30d, 90d, year, all`,
          HTTP_STATUS.BAD_REQUEST,
        );
    }
  }

  /**
   * Retorna os produtos mais vendidos por período
   *
   * @param period - Período de análise (7d, 30d, 90d, year, all)
   * @param limit  - Quantidade de produtos a retornar (padrão: 10)
   * @returns Lista de produtos com quantidade vendida
   *
   * @example
   * const topProducts = await statsService.getTopProducts('30d', 5);
   * // [
   * //   { product_id: 'uuid', product_name: 'Camiseta X', total_sold: 45 },
   * //   { product_id: 'uuid', product_name: 'Calça Y', total_sold: 32 },
   * //   ...
   * // ]
   */
  async getTopProducts(period: StatsPeriod = '30d', limit: number = 10) {
    try {
      const startDate = this.getDateFromPeriod(period);

      const qb = this.orderItemRepository
        .createQueryBuilder('orderItem')
        .select('orderItem.product_id', 'product_id')
        .addSelect('product.name', 'product_name')
        .addSelect('SUM(orderItem.quantity)', 'total_sold')
        .leftJoin('orderItem.product', 'product')
        .leftJoin('orderItem.order', 'order')
        .where('order.status IN (:...statuses)', {
          statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
        })
        .groupBy('orderItem.product_id')
        .addGroupBy('product.name')
        .orderBy('total_sold', 'DESC')
        .limit(limit);

      if (startDate) {
        qb.andWhere('order.created_at >= :date', { date: startDate });
      }

      const results = await qb.getRawMany();

      log.info('Produtos mais vendidos consultados', {
        period,
        limit,
        count: results.length,
      });

      return results.map((r) => ({
        product_id: r.product_id,
        product_name: r.product_name,
        total_sold: parseInt(r.total_sold, 10),
      }));
    } catch (error) {
      log.error('Erro ao buscar produtos mais vendidos', { error, period, limit });
      throw error;
    }
  }

  /**
   * Retorna estatísticas de receita por período
   *
   * @param period - Período de análise
   * @returns Receita total e quantidade de pedidos no período
   *
   * @example
   * const stats = await statsService.getRevenueByPeriod('7d');
   * // { revenue: 125000, orderCount: 15 }  // R$ 1.250,00 em 15 pedidos
   */
  async getRevenueByPeriod(period: StatsPeriod = '30d') {
    try {
      const startDate = this.getDateFromPeriod(period);

      const qb = this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total_amount)', 'revenue')
        .addSelect('COUNT(order.id)', 'orderCount')
        .where('order.status IN (:...statuses)', {
          statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
        });

      if (startDate) {
        qb.andWhere('order.created_at >= :date', { date: startDate });
      }

      const result = await qb.getRawOne();

      const revenue = parseInt(result?.revenue || '0', 10);
      const orderCount = parseInt(result?.orderCount || '0', 10);

      log.info('Estatísticas de receita consultadas', {
        period,
        revenue,
        orderCount,
      });

      return { revenue, orderCount };
    } catch (error) {
      log.error('Erro ao buscar receita por período', { error, period });
      throw error;
    }
  }

  /**
   * Retorna a distribuição de pedidos por status
   *
   * Útil para dashboards administrativos
   *
   * @returns Array com status e quantidade de pedidos
   *
   * @example
   * const breakdown = await statsService.getOrderStatusBreakdown();
   * // [
   * //   { status: 'PENDING', count: 12 },
   * //   { status: 'PAID', count: 87 },
   * //   { status: 'SHIPPED', count: 45 },
   * //   ...
   * // ]
   */
  async getOrderStatusBreakdown() {
    try {
      const breakdown = await this.orderRepository
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(order.id)', 'count')
        .groupBy('order.status')
        .getRawMany();

      log.info('Distribuição de status consultada', {
        totalStatuses: breakdown.length,
      });

      return breakdown.map((item) => ({
        status: item.status,
        count: parseInt(item.count, 10),
      }));
    } catch (error) {
      log.error('Erro ao buscar distribuição de status', { error });
      throw error;
    }
  }
}
