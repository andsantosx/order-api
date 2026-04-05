import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { ShippingAddress } from '../entities/ShippingAddress';
import { User } from '../entities/User';
import { Size } from '../entities/Size';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';
import { AppDataSource } from '../../data-source';
import { FindOptionsWhere } from 'typeorm';
import bcrypt from 'bcryptjs';
import { log } from '../../config/logger';
import { executeInTransaction } from '../../utils/transaction';
import { sanitizeAddressData } from '../../utils/sanitizer';
import { isValidZipCode } from '../../utils/validators';
import { CPF } from '../domain/value-objects/CPF';
import { ProductSize } from '../entities/ProductSize';
import { ORDER, MONEY, SHIPPING, SECURITY, ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

/**
 * Interface para dados de endereço de entrega
 */
interface ShippingAddressData {
  street: string;
  city: string;
  state: string;
  zipCode?: string;
  country: string;
}

/**
 * Interface para item do pedido (input)
 */
interface OrderItemInput {
  productId: string;
  quantity: number;
  size: string;
}

/**
 * Service responsável pela lógica de negócio de pedidos
 */
export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private shippingAddressRepository = AppDataSource.getRepository(ShippingAddress);
  private userRepository = AppDataSource.getRepository(User);
  private sizeRepository = AppDataSource.getRepository(Size);
  private productSizeRepository = AppDataSource.getRepository(ProductSize);

  /**
   * Retorna pedidos filtrados por usuário e/ou status com paginação
   */
  async getAll(
    isAdmin: boolean,
    userId?: string,
    status?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const whereCondition: any = {};

    if (!isAdmin && userId) {
      whereCondition.user = { id: userId };
    } else if (isAdmin && userId) {
      whereCondition.user = { id: userId };
    }

    if (status) {
      whereCondition.statusId = status;
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where: whereCondition,
      relations: ['user', 'items', 'items.product', 'shippingAddress', 'status'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    log.info('Pedidos listados', { count: orders.length, total, userId, isAdmin, page });

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Transforma pedido para formato de resposta
   */
  transform(order: Order) {
    return order;
  }

  /**
   * Busca um pedido específico
   */
  async getOne(id: string, userId?: string, isAdmin: boolean = false) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product', 'shippingAddress', 'status'],
    });

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (userId && !isAdmin && order.user?.id !== userId) {
      throw new AppError(ERROR_MESSAGES.ORDER_UNAUTHORIZED, HTTP_STATUS.FORBIDDEN);
    }

    log.info('Pedido consultado', { orderId: id });
    return order;
  }

  /**
   * Atualiza o status de um pedido
   */
  async updateStatus(id: string, status: number, requesterIsAdmin: boolean = false) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['status'],
    });

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (!requesterIsAdmin) {
      throw new AppError(
        'Apenas administradores podem alterar o status do pedido',
        HTTP_STATUS.FORBIDDEN,
      );
    }

    if (!order.canTransitionTo(status)) {
      const currentStatusName = order.status?.name || `ID ${order.statusId}`;
      throw new AppError(
        `Não é possível alterar o status de ${currentStatusName} para o novo status solicitado.`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    order.statusId = status;
    await this.orderRepository.save(order);

    log.info('Status do pedido atualizado pelo admin', { orderId: id, newStatus: status });
    return order;
  }

  /**
   * Cria um novo pedido
   */
  async create(
    userId: string | undefined,
    guestName: string | undefined,
    guestEmail: string | undefined,
    guestCpf: string | undefined,
    phone: string | undefined,
    items: OrderItemInput[],
    shippingAddressData: ShippingAddressData,
    acceptedTerms: boolean,
    idempotencyKey?: string,
  ) {
    this.validateOrderInput(
      userId,
      guestEmail,
      guestCpf,
      shippingAddressData,
      items,
      acceptedTerms,
    );

    const user = await this.resolveUser(userId, guestEmail, guestName, guestCpf, phone);
    const finalEmail = guestEmail || user.email;

    const { productsMap, sizeNamesMap, totalAmount, shippingCost } =
      await this.validateAndCalculateOrder(items);

    const existingOrder = await this.checkIdempotency(
      user.id,
      finalEmail,
      totalAmount,
      idempotencyKey,
    );
    if (existingOrder) {
      log.info('Pedido duplicado detectado', { orderId: existingOrder.id });
      return this.getOne(existingOrder.id);
    }

    const order = await this.createOrderTransaction(
      user,
      finalEmail,
      items,
      productsMap,
      sizeNamesMap,
      totalAmount,
      shippingCost,
      shippingAddressData,
      idempotencyKey,
      phone,
    );

    if (acceptedTerms && !user.acceptedTerms) {
      user.acceptedTerms = true;
      await this.userRepository.save(user);
    }

    return this.getOne(order.id);
  }

  private validateOrderInput(
    userId: string | undefined,
    guestEmail: string | undefined,
    guestCpf: string | undefined,
    shippingAddress: ShippingAddressData,
    items: OrderItemInput[],
    acceptedTerms: boolean,
  ): void {
    if (!acceptedTerms)
      throw new AppError(ERROR_MESSAGES.TERMS_NOT_ACCEPTED, HTTP_STATUS.BAD_REQUEST);
    if (guestCpf) new CPF(guestCpf);
    if (!shippingAddress.zipCode)
      throw new AppError(ERROR_MESSAGES.ZIPCODE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    if (!isValidZipCode(shippingAddress.zipCode))
      throw new AppError(ERROR_MESSAGES.INVALID_ZIPCODE, HTTP_STATUS.BAD_REQUEST);
    if (!userId && !guestEmail)
      throw new AppError('Identificação necessária', HTTP_STATUS.BAD_REQUEST);
    if (!items || items.length === 0)
      throw new AppError('Itens necessários', HTTP_STATUS.BAD_REQUEST);
    if (items.length > ORDER.MAX_ITEMS_PER_ORDER)
      throw new AppError(ERROR_MESSAGES.TOO_MANY_ITEMS, HTTP_STATUS.BAD_REQUEST);
  }

  private async validateAndCalculateOrder(items: OrderItemInput[]) {
    const productsMap = new Map<string, Product>();
    const sizeNamesMap = new Map<string, string>();
    let subtotal = 0;

    for (const item of items) {
      const product = await this.productRepository.findOne({ where: { id: item.productId } });
      if (!product)
        throw new AppError(`Produto ${item.productId} não encontrado`, HTTP_STATUS.NOT_FOUND);

      let size: Size | null = null;
      const sizeId = parseInt(item.size, 10);
      if (!isNaN(sizeId)) size = await this.sizeRepository.findOneBy({ id: sizeId });
      if (!size) size = await this.sizeRepository.findOneBy({ name: item.size });
      if (!size) throw new AppError(`Tamanho ${item.size} não encontrado`, HTTP_STATUS.NOT_FOUND);

      const productSize = await this.productSizeRepository.findOne({
        where: { product: { id: product.id }, size: { id: size.id } },
      });
      if (!productSize) throw new AppError(`Tamanho indisponível`, HTTP_STATUS.BAD_REQUEST);

      subtotal += product.priceCents * item.quantity;
      productsMap.set(item.productId, product);
      sizeNamesMap.set(item.size, size.name);
    }

    const shippingCost =
      subtotal >= SHIPPING.FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING.FIXED_SHIPPING_COST_CENTS;
    const totalAmount = subtotal + shippingCost;

    if (totalAmount < MONEY.MIN_ORDER_VALUE_CENTS)
      throw new AppError(ERROR_MESSAGES.ORDER_TOO_SMALL, HTTP_STATUS.BAD_REQUEST);
    return { productsMap, sizeNamesMap, totalAmount, shippingCost };
  }

  private async resolveUser(
    userId: string | undefined,
    guestEmail: string | undefined,
    guestName: string | undefined,
    guestCpf: string | undefined,
    phone: string | undefined,
  ): Promise<User> {
    if (userId) {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user) return user;
    }
    if (guestEmail) return await this.handleGuestUser(guestEmail, guestName, guestCpf, phone);
    throw new AppError('Usuário não identificado', HTTP_STATUS.BAD_REQUEST);
  }

  private async handleGuestUser(
    email: string,
    name: string | undefined,
    cpf: string | undefined,
    phone: string | undefined,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) throw new AppError('E-mail já cadastrado', HTTP_STATUS.BAD_REQUEST);
    return await this.createGuestAccount(email, name, cpf, phone);
  }

  private async createGuestAccount(
    email: string,
    name: string | undefined,
    cpf: string | undefined,
    phone: string | undefined,
  ): Promise<User> {
    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, SECURITY.BCRYPT_SALT_ROUNDS);
    const newUser = this.userRepository.create({
      name: name || 'Cliente',
      email,
      passwordHash: hashedPassword,
      isAdmin: false,
      document: cpf,
      phone,
      acceptedTerms: true,
    });
    return await this.userRepository.save(newUser);
  }

  private async checkIdempotency(
    userId: string,
    email: string | undefined,
    totalAmount: number,
    idempotencyKey?: string,
  ): Promise<Order | null> {
    if (idempotencyKey) {
      const order = await this.orderRepository.findOneBy({ idempotencyKey });
      if (order) return order;
    }
    const threshold = new Date(Date.now() - ORDER.IDEMPOTENCY_WINDOW_SECONDS * 1000);
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .where('order.totalAmount = :totalAmount', { totalAmount })
      .andWhere('order.createdAt >= :date', { date: threshold });
    if (userId) qb.andWhere('order.user.id = :userId', { userId });
    else if (email) qb.andWhere('order.guestEmail = :guestEmail', { guestEmail: email });
    return await qb.getOne();
  }

  private async createOrderTransaction(
    user: User,
    finalEmail: string | undefined,
    items: OrderItemInput[],
    productsMap: Map<string, Product>,
    sizeNamesMap: Map<string, string>,
    totalAmount: number,
    shippingCost: number,
    shippingAddressData: ShippingAddressData,
    idempotencyKey?: string,
    phone?: string,
  ): Promise<Order> {
    return await executeInTransaction(async (manager) => {
      const orderItems = items.map((item) => {
        const product = productsMap.get(item.productId)!;
        return this.orderItemRepository.create({
          product,
          quantity: item.quantity,
          unitPrice: product.priceCents,
          totalPrice: product.priceCents * item.quantity,
          size: sizeNamesMap.get(item.size)!,
        });
      });

      const newOrder = manager.create(Order, {
        user,
        guestEmail: finalEmail,
        items: orderItems,
        totalAmount,
        currency: MONEY.DEFAULT_CURRENCY,
        idempotencyKey: idempotencyKey || uuidv4(),
        statusId: OrderStatus.PENDING,
        acceptedTerms: true,
        phone,
      });

      const savedOrder = await manager.save(newOrder);
      const sanitized = sanitizeAddressData(shippingAddressData);
      const address = manager.create(ShippingAddress, {
        order: savedOrder,
        street: sanitized.street || shippingAddressData.street,
        city: sanitized.city || shippingAddressData.city,
        state: sanitized.state || shippingAddressData.state,
        zipCode: sanitized.zipCode || shippingAddressData.zipCode,
        country: sanitized.country || shippingAddressData.country,
      });
      await manager.save(address);
      return savedOrder;
    });
  }
}
