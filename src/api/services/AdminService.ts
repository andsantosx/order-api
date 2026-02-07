import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { Product } from '../entities/Product';

export class AdminService {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);

  async getDashboardStats(startDate?: string, endDate?: string) {
    // Prepare Date Range Conditions
    // If dates are provided, we filter. If not, defaults apply:
    // Revenue: default to All Time (or we could say last 30 days, but usually checks all)
    // Orders: default to All Time count
    // RECENT: always last 5 regardless of filter? Usually yes, or filter them too.
    // Let's filter MAIN stats by date, but keep totals as totals if no date provided.

    const qbRevenue = this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total_amount)', 'sum')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
      });

    const qbOrders = this.orderRepository.createQueryBuilder('order');

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // end needs to be end of day
      end.setHours(23, 59, 59, 999);

      qbRevenue.andWhere('order.created_at BETWEEN :start AND :end', { start, end });
      qbOrders.andWhere('order.created_at BETWEEN :start AND :end', { start, end });
    }

    const revenueResult = await qbRevenue.getRawOne();
    const totalRevenue = revenueResult ? parseInt(revenueResult.sum || '0', 10) : 0;

    const totalOrders = await qbOrders.getCount();

    // 3. Total Products (Always Global Count)
    const totalProducts = await this.productRepository.count();

    // 4. Recent Orders (Last 5) - Optionally filtered?
    // Usually recent orders table reflects the filter, OR it just shows "Live Feed".
    // Let's keep it "Recent Global" for now, or "Recent in Range".
    // User asked for "Overview", usually "Recent" implies global context.
    // If I filter `total orders` to last 7 days, seeing an order from 2 years ago in the table is weird.
    // Let's apply filter to recent orders too if provided.
    const qbRecent = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.created_at', 'DESC')
      .take(5)
      .select([
        'order.id',
        'order.total_amount',
        'order.status',
        'order.created_at',
        'order.guest_email',
        'user.id',
        'user.name',
        'user.email',
      ]);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qbRecent.andWhere('order.created_at BETWEEN :start AND :end', { start, end });
    }

    const recentOrders = await qbRecent.getMany();

    // Format recent orders for display
    const recentOrdersFormatted = recentOrders.map((order) => ({
      id: order.id,
      customer: order.user?.name || order.guest_email || 'Guest',
      total: order.total_amount,
      status: order.status,
      date: order.created_at,
    }));

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      recentOrders: recentOrdersFormatted,
    };
  }
}
