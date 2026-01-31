import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { ShippingAddress } from '../entities/ShippingAddress';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';
import { AppDataSource } from '../../data-source';
import bcrypt from 'bcryptjs';

interface ShippingAddressData {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
}

export class OrderService {
    private orderRepository = AppDataSource.getRepository(Order);
    private productRepository = AppDataSource.getRepository(Product);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);
    private shippingAddressRepository = AppDataSource.getRepository(ShippingAddress);
    private userRepository = AppDataSource.getRepository(User);

    /**
     * Retorna pedidos. Se admin, todos. Se user, apenas os seus.
     */
    async getAll(userId?: string, isAdmin: boolean = false) {
        let orders: any[];
        if (isAdmin) {
            orders = await this.orderRepository.find({
                relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress'],
                order: { created_at: 'DESC' }
            });
        } else if (userId) {
            orders = await this.orderRepository.find({
                where: { user: { id: userId } },
                relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress'],
                order: { created_at: 'DESC' }
            });
        } else {
            orders = [];
        }

        return orders.map(order => this.transform(order));
    }

    private transform(order: Order) {
        return {
            ...order,
            shippingAddress: order.shippingAddress && order.shippingAddress.length > 0 ? order.shippingAddress[0] : null
        };
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

        return this.transform(order);
    }

    /**
     * Atualiza o status de um pedido.
     */
    async updateStatus(id: string, status: OrderStatus) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress']
        });

        if (!order) {
            throw new AppError('Pedido não encontrado', 404);
        }

        order.status = status;
        const savedOrder = await this.orderRepository.save(order);
        return this.transform(savedOrder);
    }

    async create(
        userId: string | undefined,
        guestEmail: string | undefined,
        guestCpf: string | undefined,
        items: { productId: string; quantity: number }[],
        shippingAddressData: ShippingAddressData
    ) {
        if (!shippingAddressData.zipCode) {
            throw new AppError('CEP é obrigatório para o envio', 400);
        }

        // Validate basic requirements: either User Logged OR Guest Email
        if (!userId && !guestEmail) {
            throw new AppError('É necessário estar logado ou fornecer um email para continuar', 400);
        }

        let user: User | null = null;
        let finalEmail = guestEmail;

        if (userId) {
            user = await this.userRepository.findOneBy({ id: userId });
            if (user) {
                finalEmail = user.email; // Use user's email if logged in
            }
        }

        // Auto-Account Creation Logic
        if (!user && finalEmail) {
            const existingUser = await this.userRepository.findOneBy({ email: finalEmail });

            if (existingUser) {
                // User exists, link order to them
                user = existingUser;
                // Update CPF/Document if provided and missing
                if (guestCpf && !user.document) {
                    user.document = guestCpf;
                    await this.userRepository.save(user);
                }
            } else {
                // User does not exist, create new account
                try {
                    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                    const hashedPassword = await bcrypt.hash(randomPassword, 10);

                    const newUser = this.userRepository.create({
                        name: 'Cliente', // Placeholder name
                        email: finalEmail,
                        password_hash: hashedPassword,
                        isAdmin: false,
                        document: guestCpf
                    });

                    user = await this.userRepository.save(newUser);

                    console.log(`[AUTO-SIGNUP] Account created for ${finalEmail}. Password: ${randomPassword}`);
                    // TODO: Send email to user with these credentials
                } catch (error) {
                    console.error('Failed to auto-create user:', error);
                    throw new AppError('Falha ao criar conta automática para o pedido', 500);
                }
            }
        }

        if (!user) {
            // Should not happen given logic above, but safe guard
            throw new AppError('Não foi possível identificar o usuário para o pedido', 400);
        }

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

        const queryBuilder = this.orderRepository.createQueryBuilder('order')
            .where('order.total_amount = :totalAmount', { totalAmount })
            .andWhere('order.created_at >= :date', { date: thirtySecondsAgo });

        if (userId) {
            queryBuilder.andWhere('order.user_id = :userId', { userId });
        } else if (finalEmail) {
            queryBuilder.andWhere('order.guest_email = :guestEmail', { guestEmail: finalEmail });
        }

        const existingOrder = await queryBuilder.getOne();

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
                user: user,
                guest_email: finalEmail,
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

            // Return using the modified getOne which handles the address transformation
            return await this.getOne(savedOrder.id);

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
