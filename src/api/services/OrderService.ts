import { Brackets, Not } from 'typeorm';
import { Order, OrderStatus, ORDER_STATUS_EVENTS } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { ShippingAddress } from '../entities/ShippingAddress';
import { EmailVerification } from '../entities/EmailVerification';
import { User } from '../entities/User';
import { Size } from '../entities/Size';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middlewares/errorHandler';
import { AppDataSource } from '../../data-source';
import bcrypt from 'bcryptjs';
import { log } from '../../config/logger';
import { executeInTransaction } from '../../utils/transaction';
import { sanitizeAddressData } from '../../utils/sanitizer';
import { isValidZipCode } from '../../utils/validators';
import { CPF } from '../domain/value-objects/CPF';
import { ProductSize } from '../entities/ProductSize';
import { ORDER, MONEY, SECURITY, ERROR_MESSAGES, HTTP_STATUS } from '../../constants';
import { domainEvents } from '../domain/events/DomainEvents';
import { OrderHistoryService } from './OrderHistoryService';
import { OrderDomainEvent, ChangedByRole } from '../../types/domain-enums';
import { ShippingAddressData, OrderItemInput } from '../../types';
import { Coupon } from '../entities/Coupon';
import { CouponUserUsage } from '../entities/CouponUserUsage';
import { injectable } from 'tsyringe';

/**
 * Interface para opções de atualização de status pelo admin
 */
interface UpdateStatusOptions {
  status: number;
  changedById: string;
  changedByRole?: ChangedByRole;
  notes?: string;
  trackingCode?: string;
  trackingUrl?: string;
}

/**
 * Service responsável pela lógica de negócio de pedidos
 */
@injectable()
export class OrderService {
  private orderRepository = AppDataSource.getRepository(Order);
  private productRepository = AppDataSource.getRepository(Product);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private shippingAddressRepository = AppDataSource.getRepository(ShippingAddress);
  private userRepository = AppDataSource.getRepository(User);
  private sizeRepository = AppDataSource.getRepository(Size);
  private productSizeRepository = AppDataSource.getRepository(ProductSize);
  private emailVerificationRepository = AppDataSource.getRepository(EmailVerification);

  /**
   * Retorna pedidos filtrados por usuário e/ou status com paginação
   */
  async getAll(
    isAdmin: boolean,
    userId?: string,
    status?: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const query = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect('o.shippingAddress', 'shippingAddress')
      .leftJoinAndSelect('o.status', 'status')
      .leftJoinAndSelect('o.statusHistory', 'statusHistory')
      .leftJoinAndSelect('o.coupon', 'coupon')
      .orderBy('o.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (!isAdmin && userId) {
      query.andWhere('user.id = :userId', { userId });
    } else if (isAdmin && userId) {
      query.andWhere('user.id = :userId', { userId });
    }

    if (status !== undefined && status !== null) {
      query.andWhere('o.statusId = :status', { status });
    }

    if (search && search.trim() !== '') {
      const originalSearch = search.trim();
      const cleanSearch = originalSearch.replace('#', '');
      const searchTerm = `%${cleanSearch}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('CAST(o.id AS TEXT) ILIKE :search', { search: searchTerm })
            .orWhere('o.guestEmail ILIKE :search', { search: searchTerm })
            .orWhere('user.name ILIKE :search', { search: searchTerm })
            .orWhere('user.document ILIKE :search', { search: searchTerm });
        }),
      );
    }

    const [orders, total] = await query.getManyAndCount();

    log.info('Pedidos listados', { count: orders.length, total, userId, isAdmin, page, search });

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca um pedido específico
   */
  async getOne(id: string, userId?: string, isAdmin: boolean = false) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'user',
        'items',
        'items.product',
        'items.product.images',
        'shippingAddress',
        'status',
        'statusHistory',
        'coupon',
      ],
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
   * Atualiza o status de um pedido (usado pelo admin)
   * Valida a máquina de estados, salva histórico e dispara evento de domínio.
   */
  async updateStatus(id: string, options: UpdateStatusOptions, requesterIsAdmin: boolean = false) {
    const {
      status: newStatusId,
      changedById,
      changedByRole = ChangedByRole.ADMIN,
      notes,
      trackingCode,
      trackingUrl,
    } = options;

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['status', 'user'],
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

    if (!order.canTransitionTo(newStatusId)) {
      const currentStatusName = order.status?.label || `ID ${order.statusId}`;
      throw new AppError(
        `Não é possível alterar o status de "${currentStatusName}" para o novo status solicitado.`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Validação específica: SHIPPED exige código de rastreio
    if (newStatusId === OrderStatus.SHIPPED && !trackingCode) {
      throw new AppError(ERROR_MESSAGES.TRACKING_CODE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    }

    const previousStatusId = order.statusId;

    // Atualizar campos de ciclo de vida e rastreio
    const updatePayload: Partial<Order> = { statusId: newStatusId };

    if (newStatusId === OrderStatus.SHIPPED) {
      updatePayload.trackingCode = trackingCode;
      updatePayload.trackingUrl = trackingUrl;
      updatePayload.shippedAt = new Date();
    } else if (newStatusId === OrderStatus.DELIVERED) {
      updatePayload.deliveredAt = new Date();
    } else if (newStatusId === OrderStatus.CANCELLED) {
      updatePayload.cancelledAt = new Date();
    }

    await this.orderRepository.update(order.id, updatePayload);

    // Registrar no histórico (fire-and-forget)
    OrderHistoryService.record({
      order: { ...order, statusId: previousStatusId } as Order,
      toStatusId: newStatusId,
      changedById,
      changedByRole: changedByRole as ChangedByRole,
      notes,
      trackingCode,
      trackingUrl,
    });

    // Disparar evento de domínio
    const eventName = ORDER_STATUS_EVENTS[newStatusId];
    if (eventName) {
      domainEvents.dispatch(eventName, {
        orderId: order.id,
        userId: order.user?.id,
        newStatusId,
        previousStatusId,
        trackingCode,
        trackingUrl,
        changedById,
        notes,
      });
    }

    log.info('Status do pedido atualizado pelo admin', {
      orderId: id,
      from: previousStatusId,
      to: newStatusId,
      by: changedById,
    });

    return this.getOne(id, undefined, true);
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
    paymentMethod?: string,
    gaClientId?: string,
    fbp?: string,
    fbc?: string,
    ipAddress?: string,
    userAgent?: string,
    couponCode?: string,
  ) {
    this.validateOrderInput(
      userId,
      guestEmail,
      guestCpf,
      shippingAddressData,
      items,
      acceptedTerms,
    );

    const { user, tempPassword } = await this.resolveUser(
      userId,
      guestEmail,
      guestName,
      guestCpf,
      phone,
    );
    const finalEmail = guestEmail || user.email;

    const { productsMap, sizeNamesMap, subtotal, totalAmount, shippingCost } =
      await this.validateAndCalculateOrder(items);

    const existingOrder = await this.checkIdempotency(
      user.id,
      finalEmail,
      totalAmount,
      idempotencyKey,
    );
    if (existingOrder) {
      log.info('Pedido duplicado detectado', { orderId: existingOrder.id });
      // Atualizar método de pagamento se for diferente
      if (paymentMethod && existingOrder.paymentMethod !== paymentMethod) {
        await this.orderRepository.update(existingOrder.id, { paymentMethod });
      }
      const order = await this.getOne(existingOrder.id);
      return { order, isNewUser: false };
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
      subtotal,
      couponCode,
      idempotencyKey,
      phone,
      gaClientId,
      fbp,
      fbc,
      ipAddress,
      userAgent,
    );

    const isNewUser = !!tempPassword;

    if (acceptedTerms && !user.acceptedTerms) {
      user.acceptedTerms = true;
      await this.userRepository.save(user);
    }

    // Registrar histórico inicial (status PENDING)
    OrderHistoryService.record({
      order: { ...order, statusId: 0 } as Order,
      toStatusId: OrderStatus.PENDING,
      changedByRole: ChangedByRole.SYSTEM,
      notes: 'Pedido criado',
    });

    // Disparar evento ORDER_CREATED
    domainEvents.dispatch(OrderDomainEvent.ORDER_CREATED, {
      orderId: order.id,
      userId: user.id,
      totalAmount,
      isAccountLinked: !userId && guestEmail && !tempPassword,
      generatedPassword: tempPassword,
      paymentMethod: paymentMethod,
      notes: 'Pedido criado',
    });

    // Disparar evento USER_CREATED se for um novo guest
    if (tempPassword) {
      domainEvents.dispatch(OrderDomainEvent.USER_GUEST_CREATED, {
        email: finalEmail,
        name: user.name,
        password: tempPassword,
      });
    }

    const finalOrder = await this.getOne(order.id);
    return { order: finalOrder, isNewUser, user: isNewUser ? user : undefined };
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
    const allItemPrices: number[] = [];
    let customizationTotal = 0;
    for (const item of items) {
      const product = await this.productRepository.findOne({ where: { id: item.productId } });
      if (!product)
        throw new AppError(`Produto ${item.productId} não encontrado`, HTTP_STATUS.NOT_FOUND);

      let size: Size | null = null;
      const sizeId = parseInt(item.size.toString(), 10);
      if (!isNaN(sizeId)) size = await this.sizeRepository.findOneBy({ id: sizeId });
      if (!size) size = await this.sizeRepository.findOneBy({ name: item.size.toString() });
      if (!size) throw new AppError(`Tamanho ${item.size} não encontrado`, HTTP_STATUS.NOT_FOUND);

      const productSize = await this.productSizeRepository.findOne({
        where: { product: { id: product.id }, size: { id: size.id } },
      });
      if (!productSize) throw new AppError(`Tamanho indisponível`, HTTP_STATUS.BAD_REQUEST);

      // Coleta os preços BASE para a promoção
      for (let i = 0; i < item.quantity; i++) {
        allItemPrices.push(product.priceCents);

        // Acumula o custo de personalização separadamente (sempre pago)
        if (item.customName || item.customNumber) {
          if (!product.isCustomizable) {
            throw new AppError(
              `Produto ${product.name} não permite personalização`,
              HTTP_STATUS.BAD_REQUEST,
            );
          }
          customizationTotal += MONEY.CUSTOMIZATION_COST_CENTS;
        }
      }

      productsMap.set(item.productId, product);
      sizeNamesMap.set(item.size.toString(), size.name);
    }

    // Lógica "Compre 2 Leve 3" aplicada apenas sobre o valor BASE das camisetas
    allItemPrices.sort((a, b) => b - a);

    let subtotal = 0;
    for (let i = 0; i < allItemPrices.length; i++) {
      if ((i + 1) % 3 !== 0) {
        subtotal += allItemPrices[i];
      }
    }

    const shippingCost = 0;
    const totalAmount = subtotal + customizationTotal + shippingCost;

    if (totalAmount < MONEY.MIN_ORDER_VALUE_CENTS)
      throw new AppError(ERROR_MESSAGES.ORDER_TOO_SMALL, HTTP_STATUS.BAD_REQUEST);
    return { productsMap, sizeNamesMap, subtotal, totalAmount, shippingCost };
  }

  private async resolveUser(
    userId: string | undefined,
    guestEmail: string | undefined,
    guestName: string | undefined,
    guestCpf: string | undefined,
    phone: string | undefined,
  ): Promise<{ user: User; tempPassword?: string }> {
    if (userId) {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user) return { user };
    }
    if (guestEmail) return await this.handleGuestUser(guestEmail, guestName, guestCpf, phone);
    throw new AppError('Usuário não identificado', HTTP_STATUS.BAD_REQUEST);
  }

  private async handleGuestUser(
    email: string,
    name: string | undefined,
    cpf: string | undefined,
    phone: string | undefined,
  ): Promise<{ user: User; tempPassword?: string }> {
    const existingUser = await this.userRepository.findOneBy({ email });

    // Se o usuário já existe, vinculamos o pedido a ele sem dar erro.
    if (existingUser) {
      log.info('Seamless Guest Checkout: vinculando pedido a usuário existente', { email });
      return { user: existingUser };
    }

    // Se é um e-mail novo, DEVE estar verificado
    const verification = await this.emailVerificationRepository.findOneBy({
      email,
      isVerified: true,
    });

    if (!verification) {
      throw new AppError(
        'E-mail não verificado. Por favor, confirme o código enviado ao seu e-mail.',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return await this.createGuestAccount(email, name, cpf, phone);
  }

  private async createGuestAccount(
    email: string,
    name: string | undefined,
    cpf: string | undefined,
    phone: string | undefined,
  ): Promise<{ user: User; tempPassword?: string }> {
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
    const savedUser = await this.userRepository.save(newUser);
    return { user: savedUser, tempPassword: randomPassword };
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
    subtotal: number,
    couponCode?: string,
    idempotencyKey?: string,
    phone?: string,
    gaClientId?: string,
    fbp?: string,
    fbc?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Order> {
    return await executeInTransaction(async (manager) => {
      let finalTotalAmount = totalAmount;
      let appliedCoupon: Coupon | undefined;
      let discountAmount = 0;

      if (couponCode) {
        const uppercaseCode = couponCode.toUpperCase().trim();

        // Lock pessimista no cupom para evitar race conditions globais
        const coupon = await manager.findOne(Coupon, {
          where: { code: uppercaseCode },
          lock: { mode: 'pessimistic_write' },
        });

        if (!coupon) {
          throw new AppError('Cupom inválido ou não encontrado', HTTP_STATUS.BAD_REQUEST);
        }

        // Regra de negócios: cupom deve estar ativo
        if (coupon.isActive === false) {
          throw new AppError('Este cupom está temporariamente inativo', HTTP_STATUS.BAD_REQUEST);
        }

        // Regra de negócios: cupom não deve estar expirado
        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
          throw new AppError('Este cupom já expirou e não é mais válido', HTTP_STATUS.BAD_REQUEST);
        }

        // Regra de negócios: limite global de usos
        if (coupon.maxUsesGlobal !== null && coupon.maxUsesGlobal !== undefined && coupon.usedCount >= coupon.maxUsesGlobal) {
          throw new AppError('Este cupom atingiu o limite máximo de usos permitido', HTTP_STATUS.BAD_REQUEST);
        }

        // Regra de negócios: mínimo de itens
        const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItemsCount < coupon.minItems) {
          throw new AppError(
            `Este cupom só é válido para compras com ${coupon.minItems} ou mais itens`,
            HTTP_STATUS.BAD_REQUEST,
          );
        }

        // Regra de negócios: subtotal mínimo do pedido
        if (coupon.minOrderValueCents !== null && coupon.minOrderValueCents !== undefined && subtotal < coupon.minOrderValueCents) {
          const minValFormatted = (coupon.minOrderValueCents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });
          throw new AppError(
            `Este cupom só é válido para compras acima de ${minValFormatted}`,
            HTTP_STATUS.BAD_REQUEST,
          );
        }

        // Regra de negócios: exclusivo para primeira compra
        if (coupon.firstOrderOnly) {
          const existingOrder = await manager.findOne(Order, {
            where: {
              user: { id: user.id },
              statusId: Not(OrderStatus.CANCELLED),
            },
          });
          if (existingOrder) {
            throw new AppError('Este cupom é exclusivo para a primeira compra', HTTP_STATUS.BAD_REQUEST);
          }
        }

        // Verificação e controle de uso POR USUÁRIO com lock pessimista
        // Garante que dois pedidos simultâneos do mesmo usuário não ultrapassem o limite
        const existingUsage = await manager
          .createQueryBuilder(CouponUserUsage, 'usage')
          .setLock('pessimistic_write')
          .where('usage.coupon_id = :couponId', { couponId: coupon.id })
          .andWhere('usage.user_id = :userId', { userId: user.id })
          .getOne();

        const currentUseCount = existingUsage?.useCount ?? 0;

        if (currentUseCount >= coupon.maxUsesPerUser) {
          throw new AppError(
            `Você já utilizou este cupom o número máximo de vezes permitido (${coupon.maxUsesPerUser}x)`,
            HTTP_STATUS.BAD_REQUEST,
          );
        }

        // Calcular desconto sobre o subtotal (após promoções, sem personalização)
        discountAmount = Math.round(subtotal * (coupon.discountPercentage / 100));

        // Regra de negócios: teto máximo de desconto
        if (coupon.maxDiscountCents !== null && coupon.maxDiscountCents !== undefined) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscountCents);
        }

        // Atualizar uso por usuário (upsert seguro dentro da transação)
        if (existingUsage) {
          existingUsage.useCount += 1;
          await manager.save(existingUsage);
        } else {
          const newUsage = manager.create(CouponUserUsage, {
            coupon,
            couponId: coupon.id,
            user,
            userId: user.id,
            useCount: 1,
          });
          await manager.save(newUsage);
        }

        // Incrementar contador global de auditoria
        coupon.usedCount += 1;
        await manager.save(coupon);

        appliedCoupon = coupon;
        finalTotalAmount = Math.max(0, totalAmount - discountAmount);
      }

      const orderItems = items.map((item) => {
        const product = productsMap.get(item.productId)!;
        return this.orderItemRepository.create({
          product,
          quantity: item.quantity,
          unitPrice:
            product.priceCents +
            (item.customName || item.customNumber ? MONEY.CUSTOMIZATION_COST_CENTS : 0),
          totalPrice:
            (product.priceCents +
              (item.customName || item.customNumber ? MONEY.CUSTOMIZATION_COST_CENTS : 0)) *
            item.quantity,
          size: sizeNamesMap.get(item.size.toString())!,
          customName: item.customName,
          customNumber: item.customNumber,
        });
      });

      const newOrder = manager.create(Order, {
        user,
        guestEmail: finalEmail,
        items: orderItems,
        totalAmount: finalTotalAmount,
        currency: MONEY.DEFAULT_CURRENCY,
        idempotencyKey: idempotencyKey || uuidv4(),
        statusId: OrderStatus.PENDING,
        acceptedTerms: true,
        phone,
        gaClientId,
        fbp,
        fbc,
        ipAddress,
        userAgent,
        coupon: appliedCoupon,
        couponCode: appliedCoupon?.code,
        discountAmount,
      });

      const savedOrder = await manager.save(newOrder);
      const sanitized = sanitizeAddressData(shippingAddressData);
      const address = manager.create(ShippingAddress, {
        order: savedOrder,
        street: sanitized.street || shippingAddressData.street,
        number: sanitized.number || shippingAddressData.number,
        reference: sanitized.reference || shippingAddressData.reference,
        city: sanitized.city || shippingAddressData.city,
        state: sanitized.state || shippingAddressData.state,
        zipCode: sanitized.zipCode || shippingAddressData.zipCode,
        neighborhood: sanitized.neighborhood || shippingAddressData.neighborhood,
        country: sanitized.country || shippingAddressData.country,
      });
      await manager.save(address);
      return savedOrder;
    });
  }
}
