import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { ShippingAddress } from '../entities/ShippingAddress';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';

interface ShippingAddressData {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export class OrderService {
    private orderRepository = AppDataSource.getRepository(Order);
    private productRepository = AppDataSource.getRepository(Product);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);
    private shippingAddressRepository = AppDataSource.getRepository(ShippingAddress);

    async getAll() {
        return this.orderRepository.find({
            relations: ['user', 'items', 'items.product', 'shippingAddress']
        });
    }

    async getOne(id: string) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['user', 'items', 'items.product', 'shippingAddress'],
        });

        if (!order) {
            throw new AppError('Pedido não encontrado', 404);
        }

        return order;
    }

    async create(guestEmail: string, items: { productId: string; quantity: number }[], shippingAddressData: ShippingAddressData) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let totalAmount = 0;
            const orderItems: OrderItem[] = [];

            for (const item of items) {
                const product = await this.productRepository.findOne({
                    where: { id: item.productId }
                });

                if (!product) {
                    throw new AppError(`Produto com ID ${item.productId} não encontrado`, 404);
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
            }

            const newOrder = this.orderRepository.create({
                user: null,
                guest_email: guestEmail,
                items: orderItems,
                total_amount: totalAmount,
                currency: 'BRL',
                idempotency_key: uuidv4(),
                status: 'PENDING',
            });

            const savedOrder = await queryRunner.manager.save(newOrder);

            // Criar endereço de entrega
            const shippingAddress = this.shippingAddressRepository.create({
                order: savedOrder,
                street: shippingAddressData.street,
                city: shippingAddressData.city,
                state: shippingAddressData.state,
                zip_code: shippingAddressData.zipCode,
                country: shippingAddressData.country,
            });

            await queryRunner.manager.save(shippingAddress);

            await queryRunner.commitTransaction();
            return this.getOne(savedOrder.id);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
