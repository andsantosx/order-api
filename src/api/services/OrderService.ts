import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
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

    /**
     * Retorna pedidos. Se admin, todos. Se user, apenas os seus.
     */
    async getAll(userId?: string, isAdmin: boolean = false) {
        if (isAdmin) {
            return this.orderRepository.find({
                relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress'],
                order: { created_at: 'DESC' }
            });
        }

        if (!userId) {
            return []; // Should not happen if auth middleware is used
        }

        return this.orderRepository.find({
            where: { user: { id: userId } },
            relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress'],
            order: { created_at: 'DESC' }
        });
    }

    /**
     * Busca um pedido pelo ID.
     */
    async getOne(id: string) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress'],
        });

        if (!order) {
            throw new AppError('Pedido não encontrado', 404);
        }

        return order;
    }

    /**
     * Atualiza o status de um pedido.
     */
    async updateStatus(id: string, status: OrderStatus) {
        const order = await this.getOne(id);
        order.status = status;
        return this.orderRepository.save(order);
    }

    async create(guestEmail: string, items: { productId: string; quantity: number }[], shippingAddressData: ShippingAddressData) {
        // 1. Calcular o total antes de iniciar a transação para verificar duplicidade
        let totalAmount = 0;
        const productsMap = new Map<string, Product>();

        for (const item of items) {
            const product = await this.productRepository.findOne({ where: { id: item.productId } });
            if (!product) {
                throw new AppError(`Produto com ID ${item.productId} não encontrado`, 404);
            }
            totalAmount += product.price_cents * item.quantity;
            productsMap.set(item.productId, product);
        }

        // 2. Verificação de Idempotência (Deduplicação)
        // Procura pedidos idênticos (mesmo email e valor) criados nos últimos 30 segundos
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

        const existingOrder = await this.orderRepository.createQueryBuilder('order')
            .where('order.guest_email = :guestEmail', { guestEmail })
            .andWhere('order.total_amount = :totalAmount', { totalAmount })
            .andWhere('order.created_at >= :date', { date: thirtySecondsAgo })
            .getOne();

        if (existingOrder) {
            console.log(`[Idempotency] Pedido duplicado detectado. Retornando pedido existente ID: ${existingOrder.id}`);
            return this.getOne(existingOrder.id);
        }

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const orderItems: OrderItem[] = [];

            // Recriar items usando os produtos já buscados
            for (const item of items) {
                const product = productsMap.get(item.productId)!;
                const itemTotalPrice = product.price_cents * item.quantity;

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
                status: OrderStatus.PENDING,
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
