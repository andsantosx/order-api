import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { Product } from '../entities/Product';
import { Not, In } from 'typeorm';

export class AdminService {
    private orderRepository = AppDataSource.getRepository(Order);
    private productRepository = AppDataSource.getRepository(Product);

    async getDashboardStats() {
        // 1. Total Revenue: Sum of total_amount for "completed" orders
        // Assuming PAID, SHIPPED, DELIVERED are revenue-generating statuses
        const revenueResult = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.total_amount)', 'sum')
            .where('order.status IN (:...statuses)', {
                statuses: [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
            })
            .getRawOne();

        const totalRevenue = revenueResult ? parseInt(revenueResult.sum || '0', 10) : 0;

        // 2. Total Orders
        const totalOrders = await this.orderRepository.count();

        // 3. Total Products
        const totalProducts = await this.productRepository.count();

        // 4. Recent Orders (Last 5)
        const recentOrders = await this.orderRepository.find({
            order: { created_at: 'DESC' },
            take: 5,
            relations: ['user'], // Include user basics if needed
            select: {
                id: true,
                total_amount: true,
                status: true,
                created_at: true,
                guest_email: true,
                user: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        });

        // Format recent orders for display
        const recentOrdersFormatted = recentOrders.map(order => ({
            id: order.id,
            customer: order.user?.name || order.guest_email || 'Guest',
            total: order.total_amount,
            status: order.status,
            date: order.created_at
        }));

        return {
            totalRevenue,
            totalOrders,
            totalProducts,
            recentOrders: recentOrdersFormatted
        };
    }
}
