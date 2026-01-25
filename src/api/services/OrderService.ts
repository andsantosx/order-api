import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { ProductVariant } from '../entities/ProductVariant';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';

export class OrderService {
    private orderRepository = AppDataSource.getRepository(Order);
    private productRepository = AppDataSource.getRepository(Product);
    private variantRepository = AppDataSource.getRepository(ProductVariant);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);

    async getAll() {
        return this.orderRepository.find({
            relations: ['user', 'items', 'items.product', 'items.variant', 'items.variant.size']
        });
    }

    async getOne(id: string) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['user', 'items', 'items.product', 'items.variant', 'items.variant.size'],
        });

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        return order;
    }

    async create(guestEmail: string, items: { productId: string; variantId: string; quantity: number }[]) {
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

                const variant = await this.variantRepository.findOne({
                    where: { id: item.variantId },
                    relations: ['size']
                });
                if (!variant) {
                    throw new AppError(`Variant with ID ${item.variantId} not found.`, 404);
                }

                if (variant.stock < item.quantity) {
                    throw new AppError(
                        `Not enough stock for ${product.name} (${variant.size.name}, ${variant.color}). Available: ${variant.stock}`,
                        400
                    );
                }

                // Usar preço da variante se existir, senão usar preço do produto
                const unitPrice = variant.price_cents || product.price_cents;
                const itemTotalPrice = unitPrice * item.quantity;
                totalAmount += itemTotalPrice;

                const newOrderItem = this.orderItemRepository.create({
                    product: product,
                    variant: variant,
                    quantity: item.quantity,
                    unit_price: unitPrice,
                    total_price: itemTotalPrice,
                });
                orderItems.push(newOrderItem);

                // Baixar estoque da variante
                variant.stock -= item.quantity;
                await queryRunner.manager.save(variant);
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
