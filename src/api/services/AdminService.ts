import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { Product } from '../entities/Product';
import { log } from '../../config/logger';
import { injectable } from 'tsyringe';

@injectable()
export class AdminService {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);

  async getDashboardStats(startDate?: string, endDate?: string) {
    // Receita: pedidos PAID, AWAITING_SHIPMENT, SHIPPED ou DELIVERED
    const qbRevenue = this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'sum')
      .where('order.statusId IN (:...statuses)', {
        statuses: [
          OrderStatus.PAID,
          OrderStatus.AWAITING_SHIPMENT,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      });

    const qbOrders = this.orderRepository.createQueryBuilder('order');

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      qbRevenue.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
      qbOrders.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }

    const revenueResult = await qbRevenue.getRawOne();
    const totalRevenue = revenueResult ? parseInt(revenueResult.sum || '0', 10) : 0;

    const totalOrders = await qbOrders.getCount();

    // Total de produtos
    const totalProducts = await this.productRepository.count();

    // Pedidos recentes (últimos 5) com relação status carregada
    const qbRecent = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.status', 'status')
      .orderBy('order.createdAt', 'DESC')
      .take(5)
      .select([
        'order.id',
        'order.totalAmount',
        'order.statusId',
        'order.createdAt',
        'order.guestEmail',
        'user.id',
        'user.name',
        'user.email',
        'status.id',
        'status.name',
        'status.label',
      ]);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qbRecent.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }

    const recentOrders = await qbRecent.getMany();

    // Contagem de pedidos por status (visão geral para o admin)
    const statusCountsRaw = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.statusId', 'statusId')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.statusId')
      .getRawMany();

    const ordersByStatus = statusCountsRaw.reduce(
      (acc: Record<number, number>, row: { statusId: string; count: string }) => {
        acc[parseInt(row.statusId, 10)] = parseInt(row.count, 10);
        return acc;
      },
      {},
    );

    // Formatar pedidos recentes
    const recentOrdersFormatted = recentOrders.map((order) => ({
      id: order.id,
      customer: order.user?.name || order.guestEmail || 'Guest',
      total: order.totalAmount,
      statusId: order.statusId,
      statusLabel: order.status?.label || String(order.statusId),
      date: order.createdAt,
    }));

    log.info('[AdminService] Dashboard stats fetched', {
      totalRevenue,
      totalOrders,
      totalProducts,
    });

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      ordersByStatus,
      recentOrders: recentOrdersFormatted,
    };
  }
}
