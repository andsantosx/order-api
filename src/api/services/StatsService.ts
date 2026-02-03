import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { Between, In } from 'typeorm';
import { log } from '../../config/logger';

export class StatsService {
    private orderRepository = AppDataSource.getRepository(Order);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);
    private productRepository = AppDataSource.getRepository(Product);

    /**
     * Get overview statistics
     */
    async getOverview() {
        try {
            const [
                totalRevenue,
                totalOrders,
                pendingOrders,
                completedOrders,
            ] = await Promise.all([
                this.getTotalRevenue(),
                this.orderRepository.count(),
                this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
                this.orderRepository.count({ where: { status: In([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]) } }),
            ]);

            // Last 30 days revenue
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentRevenue = await this.orderRepository
                .createQueryBuilder('order')
                .select('SUM(order.total_amount)', 'total')
                .where('order.created_at >= :date', { date: thirtyDaysAgo })
                .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] })
                .getRawOne();

            return {
                totalRevenue: totalRevenue || 0,
                revenueLastMonth: parseInt(recentRevenue?.total || '0', 10),
                totalOrders,
                pendingOrders,
                completedOrders,
            };
        } catch (error) {
            log.error('Error fetching overview stats', { error });
            throw error;
        }
    }

    /**
     * Get sales by period
     */
    async getSalesByPeriod(period: '7days' | '30days' | '90days' | 'year') {
        const days = {
            '7days': 7,
            '30days': 30,
            '90days': 90,
            'year': 365,
        }[period];

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        try {
            const sales = await this.orderRepository
                .createQueryBuilder('order')
                .select('DATE(order.created_at)', 'date')
                .addSelect('COUNT(order.id)', 'orders')
                .addSelect('SUM(order.total_amount)', 'revenue')
                .where('order.created_at >= :startDate', { startDate })
                .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] })
                .groupBy('DATE(order.created_at)')
                .orderBy('date', 'ASC')
                .getRawMany();

            return sales.map(s => ({
                date: s.date,
                orders: parseInt(s.orders, 10),
                revenue: parseInt(s.revenue || '0', 10),
            }));
        } catch (error) {
            log.error('Error fetching sales by period', { error, period });
            throw error;
        }
    }

    /**
     * Get best selling products
     */
    async getBestSellers(limit: number = 10) {
        try {
            const bestSellers = await this.orderItemRepository
                .createQueryBuilder('orderItem')
                .select('product.id', 'productId')
                .addSelect('product.name', 'productName')
                .addSelect('SUM(orderItem.quantity)', 'totalQuantity')
                .addSelect('SUM(orderItem.total_price)', 'totalRevenue')
                .addSelect('COUNT(DISTINCT orderItem.order)', 'orderCount')
                .innerJoin('orderItem.product', 'product')
                .innerJoin('orderItem.order', 'order')
                .where('order.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] })
                .groupBy('product.id')
                .addGroupBy('product.name')
                .orderBy('totalQuantity', 'DESC')
                .limit(limit)
                .getRawMany();

            return bestSellers.map(item => ({
                productId: item.productId,
                productName: item.productName,
                totalQuantity: parseInt(item.totalQuantity, 10),
                totalRevenue: parseInt(item.totalRevenue || '0', 10),
                orderCount: parseInt(item.orderCount, 10),
            }));
        } catch (error) {
            log.error('Error fetching best sellers', { error });
            throw error;
        }
    }

    /**
     * Get revenue statistics
     */
    async getRevenueStats(fromDate?: Date, toDate?: Date) {
        try {
            const query = this.orderRepository
                .createQueryBuilder('order')
                .select('SUM(order.total_amount)', 'total')
                .addSelect('AVG(order.total_amount)', 'average')
                .addSelect('COUNT(order.id)', 'count')
                .where('order.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] });

            if (fromDate && toDate) {
                query.andWhere('order.created_at BETWEEN :fromDate AND :toDate', { fromDate, toDate });
            }

            const result = await query.getRawOne();

            return {
                totalRevenue: parseInt(result?.total || '0', 10),
                averageOrderValue: parseInt(result?.average || '0', 10),
                orderCount: parseInt(result?.count || '0', 10),
            };
        } catch (error) {
            log.error('Error fetching revenue stats', { error });
            throw error;
        }
    }

    /**
     * Get total revenue from all completed orders
     */
    private async getTotalRevenue(): Promise<number> {
        const result = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total_amount)', 'total')
            .where('order.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] })
            .getRawOne();

        return parseInt(result?.total || '0', 10);
    }

    /**
     * Get order status breakdown
     */
    async getOrderStatusBreakdown() {
        try {
            const breakdown = await this.orderRepository
                .createQueryBuilder('order')
                .select('order.status', 'status')
                .addSelect('COUNT(order.id)', 'count')
                .groupBy('order.status')
                .getRawMany();

            return breakdown.map(item => ({
                status: item.status,
                count: parseInt(item.count, 10),
            }));
        } catch (error) {
            log.error('Error fetching order status breakdown', { error });
            throw error;
        }
    }
}
