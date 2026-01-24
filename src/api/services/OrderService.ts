import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';

export class OrderService {
    private orderRepository = AppDataSource.getRepository(Order);
    private productRepository = AppDataSource.getRepository(Product);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);

    async getAll() {
        return this.orderRepository.find({ relations: ['user', 'items', 'items.product'] });
    }

    async getOne(id: string) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['user', 'items', 'items.product'],
        });

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        return order;
    }

    async create(guestEmail: string, items: { productId: string; quantity: number }[]) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let totalAmount = 0;
            const orderItems: OrderItem[] = [];

            for (const item of items) {
                const product = await this.productRepository.findOneBy({ id: item.productId });
                if (!product) {
                    throw new AppError(`Product with ID ${item.productId} not found.`, 404);
                }
                if (product.stock < item.quantity) {
                    throw new AppError(`Not enough stock for product ${product.name}.`, 400);
                }

                const itemTotalPrice = product.price_cents * item.quantity;
                totalAmount += itemTotalPrice;

                const newOrderItem = this.orderItemRepository.create({
                    product: product,
                    quantity: item.quantity,
                    unit_price: product.price_cents,
                    total_price: itemTotalPrice,
                });
                orderItems.push(newOrderItem);

                product.stock -= item.quantity;
                await queryRunner.manager.save(product);
            }

            const newOrder = this.orderRepository.create({
                user: null, // Always null for guest checkout
                guest_email: guestEmail,
                items: orderItems,
                total_amount: totalAmount,
                currency: 'BRL',
                idempotency_key: uuidv4(),
                status: 'PENDING',
            });

            // The 'cascade: true' option in Order.items will save the orderItems automatically.
            const savedOrder = await queryRunner.manager.save(newOrder);

            await queryRunner.commitTransaction();
            return savedOrder;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
