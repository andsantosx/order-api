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
 *
 * Gerencia todo o ciclo de vida dos pedidos:
 * - Criação com validações e cálculos
 * - Consulta e filtragem
 * - Atualização de status
 *
 * Implementa idempotência para evitar pedidos duplicados
 * e criação automática de contas para usuários convidados.
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
   *
   * Administradores podem ver todos os pedidos
   * Usuários regulares veem apenas seus próprios pedidos
   *
   * @param isAdmin - Se true, retorna todos os pedidos
   * @param userId - ID do usuário (opcional para admin)
   * @param status - Filtro de status (opcional)
   * @param page - Número da página (padrão: 1)
   * @param limit - Itens por página (padrão: 20)
   * @returns Lista de pedidos paginada
   */
  async getAll(
    isAdmin: boolean,
    userId?: string,
    status?: OrderStatus,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const whereCondition: FindOptionsWhere<Order> = {};

    // Admin: pode ver todos os pedidos ou filtrar por usuário
    if (isAdmin) {
      if (userId) {
        whereCondition.user = { id: userId };
      }
      if (status) {
        whereCondition.status = status;
      }
    } else {
      // Usuário regular: apenas seus pedidos
      if (!userId) {
        log.info('Usuário não autenticado tentou listar pedidos');
        return { data: [], total: 0, page, limit };
      }
      whereCondition.user = { id: userId };
      if (status) {
        whereCondition.status = status;
      }
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress'],
      order: { created_at: 'DESC' },
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
   * Converte endereço de snake_case para camelCase
   */
  transform(order: Order) {
    return order;
  }

  /**
   * Busca um pedido pelo ID
   *
   * @param id - ID do pedido
   * @returns Pedido com todas as relações
   * @throws {AppError} 404 - Se o pedido não for encontrado
   */
  async getOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product', 'items.product.images', 'shippingAddress'],
    });

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    log.info('Pedido consultado', { orderId: id });
    return order;
  }

  /**
   * Atualiza o status de um pedido
   *
   * @param id - ID do pedido
   * @param status - Novo status
   * @returns Pedido atualizado
   * @throws {AppError} 404 - Se o pedido não for encontrado
   */
  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.orderRepository.findOneBy({ id });

    if (!order) {
      throw new AppError(ERROR_MESSAGES.ORDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    order.status = status;
    await this.orderRepository.save(order);

    log.info('Status do pedido atualizado', { orderId: id, newStatus: status });
    return order;
  }

  /**
   * Cria um novo pedido
   *
   * Fluxo completo de criação:
   * 1. Valida dados de entrada (CEP, email, items)
   * 2. Identifica ou cria usuário (auto-signup para guests)
   * 3. Valida produtos e calcula totais
   * 4. Verifica idempotência (evita duplicatas)
   * 5. Cria pedido, items e endereço em transação atômica
   *
   * @param userId - ID do usuário autenticado (opcional)
   * @param guestName - Nome do convidado (opcional)
   * @param guestEmail - Email do convidado (obrigatório se não autenticado)
   * @param guestCpf - CPF do convidado (opcional)
   * @param items - Lista de items do pedido
   * @param shippingAddressData - Dados do endereço de entrega
   * @returns Pedido criado com todas as relações
   * @throws {AppError} 400 - Dados inválidos
   * @throws {AppError} 404 - Produto não encontrado
   * @throws {AppError} 500 - Erro ao criar conta ou processar pedido
   */
  async create(
    userId: string | undefined,
    guestName: string | undefined,
    guestEmail: string | undefined,
    guestCpf: string | undefined,
    items: OrderItemInput[],
    shippingAddressData: ShippingAddressData,
    acceptedTerms: boolean,
  ) {
    // 1. Validações iniciais
    this.validateOrderInput(userId, guestEmail, shippingAddressData, items, acceptedTerms);

    // 2. Identifica ou cria usuário
    const user = await this.resolveUser(userId, guestEmail, guestName, guestCpf);
    const finalEmail = guestEmail || user.email;

    // 3. Valida produtos e calcula total
    const { productsMap, sizeNamesMap, totalAmount, shippingCost } =
      await this.validateAndCalculateOrder(items);

    // 4. Verifica duplicação (idempotência)
    const existingOrder = await this.checkIdempotency(user.id, finalEmail, totalAmount);
    if (existingOrder) {
      log.info('Pedido duplicado detectado - retornando pedido existente', {
        orderId: existingOrder.id,
      });
      return this.getOne(existingOrder.id);
    }

    // 5. Cria pedido em transação
    const order = await this.createOrderTransaction(
      user,
      finalEmail,
      items,
      productsMap,
      sizeNamesMap,
      totalAmount,
      shippingCost,
      shippingAddressData,
    );

    // 6. Atualiza aceite de termos do usuário se necessário
    if (acceptedTerms && !user.accepted_terms) {
      user.accepted_terms = true;
      await this.userRepository.save(user);
    }

    log.info('Pedido criado com sucesso', {
      orderId: order.id,
      userId: user.id,
      total: totalAmount,
    });

    return this.getOne(order.id);
  }

  /* ==========================================
   * MÉTODOS PRIVADOS - VALIDAÇÃO
   * ========================================== */

  /**
   * Valida dados de entrada do pedido
   * Verifica se todos os campos obrigatórios estão presentes
   *
   * @throws {AppError} 400 - Se dados obrigatórios estiverem faltando
   */
  private validateOrderInput(
    userId: string | undefined,
    guestEmail: string | undefined,
    shippingAddress: ShippingAddressData,
    items: OrderItemInput[],
    acceptedTerms: boolean,
  ): void {
    // Valida aceite dos termos
    if (!acceptedTerms) {
      throw new AppError(ERROR_MESSAGES.TERMS_NOT_ACCEPTED, HTTP_STATUS.BAD_REQUEST);
    }

    // Valida CEP
    if (!shippingAddress.zipCode) {
      throw new AppError(ERROR_MESSAGES.ZIPCODE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (!isValidZipCode(shippingAddress.zipCode)) {
      throw new AppError(ERROR_MESSAGES.INVALID_ZIPCODE, HTTP_STATUS.BAD_REQUEST);
    }

    // Valida identificação do usuário
    if (!userId && !guestEmail) {
      throw new AppError(
        'É necessário estar logado ou fornecer um email para continuar',
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Valida items
    if (!items || items.length === 0) {
      throw new AppError('O pedido deve conter pelo menos um item', HTTP_STATUS.BAD_REQUEST);
    }

    if (items.length > ORDER.MAX_ITEMS_PER_ORDER) {
      throw new AppError(ERROR_MESSAGES.TOO_MANY_ITEMS, HTTP_STATUS.BAD_REQUEST);
    }

    // Valida quantidade de cada item
    items.forEach((item, index) => {
      if (item.quantity < ORDER.MIN_ITEM_QUANTITY || item.quantity > ORDER.MAX_ITEM_QUANTITY) {
        throw new AppError(
          `Item ${index + 1}: ${ERROR_MESSAGES.INVALID_QUANTITY}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    });
  }

  /**
   * Valida produtos e calcula total do pedido
   *
   * @returns Mapa de produtos, mapa de nomes de tamanhos, total e custo de envio
   * @throws {AppError} 404 - se algum produto não for encontrado
   * @throws {AppError} 400 - se algum tamanho for inválido
   */
  private async validateAndCalculateOrder(items: OrderItemInput[]): Promise<{
    productsMap: Map<string, Product>;
    sizeNamesMap: Map<string, string>;
    totalAmount: number;
    shippingCost: number;
  }> {
    const productsMap = new Map<string, Product>();
    const sizeNamesMap = new Map<string, string>();
    let subtotal = 0;

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new AppError(
          `Produto com ID ${item.productId} não encontrado`,
          HTTP_STATUS.NOT_FOUND,
        );
      }

      // Busca o tamanho pelo ID ou pelo Nome
      let size: Size | null = null;
      const sizeId = parseInt(item.size, 10);

      if (!isNaN(sizeId)) {
        size = await this.sizeRepository.findOneBy({ id: sizeId });
      }

      // Se não encontrou por ID ou se item.size não for número, tenta por nome (ex: "M", "G")
      if (!size) {
        size = await this.sizeRepository.findOneBy({ name: item.size });
      }

      if (!size) {
        throw new AppError(`Tamanho "${item.size}" não encontrado`, HTTP_STATUS.NOT_FOUND);
      }

      // Verifica se o tamanho está disponível para este produto
      const productSize = await this.productSizeRepository.findOne({
        where: {
          product: { id: product.id },
          size: { id: size.id },
        },
      });

      if (!productSize) {
        throw new AppError(
          `O tamanho "${size.name}" não está disponível para o produto "${product.name}"`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      subtotal += product.price_cents * item.quantity;
      productsMap.set(item.productId, product);
      sizeNamesMap.set(item.size, size.name);
    }

    // Calcula frete (grátis acima do threshold)
    const shippingCost =
      subtotal >= SHIPPING.FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING.FIXED_SHIPPING_COST_CENTS;

    const totalAmount = subtotal + shippingCost;

    // Valida limites do pedido
    if (totalAmount < MONEY.MIN_ORDER_VALUE_CENTS) {
      throw new AppError(ERROR_MESSAGES.ORDER_TOO_SMALL, HTTP_STATUS.BAD_REQUEST);
    }

    if (totalAmount > MONEY.MAX_ORDER_VALUE_CENTS) {
      throw new AppError(ERROR_MESSAGES.ORDER_TOO_LARGE, HTTP_STATUS.BAD_REQUEST);
    }

    return { productsMap, sizeNamesMap, totalAmount, shippingCost };
  }

  /* ==========================================
   * MÉTODOS PRIVADOS - USUÁRIO
   * ========================================== */

  /**
   * Resolve o usuário para o pedido
   *
   * Se userId fornecido: busca usuário
   * Se guest com email existente: vincula ao usuário existente
   * Se guest com email novo: cria conta automaticamente (auto-signup)
   *
   * @returns Usuário (encontrado ou criado)
   * @throws {AppError} 400 - Se não for possível identificar usuário
   * @throws {AppError} 500 - Se falhar ao criar conta
   */
  private async resolveUser(
    userId: string | undefined,
    guestEmail: string | undefined,
    guestName: string | undefined,
    guestCpf: string | undefined,
  ): Promise<User> {
    // Usuário autenticado
    if (userId) {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (user) {
        return user;
      }
    }

    // Guest checkout
    if (guestEmail) {
      return await this.handleGuestUser(guestEmail, guestName, guestCpf);
    }

    throw new AppError(
      'Não foi possível identificar o usuário para o pedido',
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  /**
   * Gerencia usuário guest
   * Cria nova conta se não existir, ou vincula à existente
   */
  private async handleGuestUser(
    email: string,
    name: string | undefined,
    cpf: string | undefined,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOneBy({ email });

    if (existingUser) {
      // Atualiza CPF se fornecido e não existir
      if (cpf && !existingUser.document) {
        existingUser.document = cpf;
        await this.userRepository.save(existingUser);
      }
      return existingUser;
    }

    // Cria nova conta automaticamente
    return await this.createGuestAccount(email, name, cpf);
  }

  /**
   * Cria conta automática para guest user
   * Gera senha aleatória e loga para que seja enviada por email
   *
   * @throws {AppError} 500 - Se falhar ao criar conta
   */
  private async createGuestAccount(
    email: string,
    name: string | undefined,
    cpf: string | undefined,
  ): Promise<User> {
    try {
      // Gera senha aleatória forte
      const randomPassword =
        Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, SECURITY.BCRYPT_SALT_ROUNDS);

      const newUser = this.userRepository.create({
        name: name || 'Cliente',
        email,
        password_hash: hashedPassword,
        isAdmin: false,
        document: cpf,
        accepted_terms: true,
      });

      const savedUser = await this.userRepository.save(newUser);

      log.info('Conta criada automaticamente para guest', {
        email,
        userId: savedUser.id,
      });
      log.warn('Senha temporária gerada - deve ser enviada por email', {
        email,
        // TODO: Integrar serviço de email para enviar credenciais
        password: randomPassword,
      });

      return savedUser;
    } catch (error) {
      log.error('Falha ao criar conta automática', { email, error });
      throw new AppError(
        'Falha ao criar conta automática para o pedido',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* ==========================================
   * MÉTODOS PRIVADOS - IDEMPOTÊNCIA
   * ========================================== */

  /**
   * Verifica se já existe pedido idêntico recente
   *
   * Previne duplicação acidental de pedidos ao verificar:
   * - Mesmo valor total
   * - Mesmo usuário/email
   * - Criado nos últimos 30 segundos
   *
   * @returns Pedido existente ou null
   */
  private async checkIdempotency(
    userId: string,
    email: string | undefined,
    totalAmount: number,
  ): Promise<Order | null> {
    const threshold = new Date(Date.now() - ORDER.IDEMPOTENCY_WINDOW_SECONDS * 1000);

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.total_amount = :totalAmount', { totalAmount })
      .andWhere('order.created_at >= :date', { date: threshold });

    // Usuário autenticado: busca por userId
    if (userId) {
      queryBuilder.andWhere('order.user_id = :userId', { userId });
      return await queryBuilder.getOne();
    }

    // Guest: busca por email
    if (email) {
      queryBuilder.andWhere('order.guest_email = :guestEmail', { guestEmail: email });
      return await queryBuilder.getOne();
    }

    // Sem userId nem email (não deveria acontecer)
    log.warn('checkIdempotency chamado sem userId nem email', { totalAmount });
    return null;
  }

  /* ==========================================
   * MÉTODOS PRIVADOS - CRIAÇÃO
   * ========================================== */

  /**
   * Cria o pedido completo dentro de uma transação
   * Garante atomicidade: ou tudo é salvo, ou nada
   *
   * @returns Pedido criado
   */
  private async createOrderTransaction(
    user: User,
    finalEmail: string | undefined,
    items: OrderItemInput[],
    productsMap: Map<string, Product>,
    sizeNamesMap: Map<string, string>,
    totalAmount: number,
    shippingCost: number,
    shippingAddressData: ShippingAddressData,
  ): Promise<Order> {
    return await executeInTransaction(async (manager) => {
      // Cria items do pedido
      const orderItems = this.createOrderItems(items, productsMap, sizeNamesMap);

      // Cria o pedido
      const newOrder = manager.create(Order, {
        user,
        guest_email: finalEmail,
        items: orderItems,
        total_amount: totalAmount,
        currency: MONEY.DEFAULT_CURRENCY,
        idempotency_key: uuidv4(),
        status: OrderStatus.PENDING,
        accepted_terms: true,
      });

      const savedOrder = await manager.save(newOrder);

      // Cria endereço de entrega
      const sanitizedAddress = sanitizeAddressData(shippingAddressData);
      const shippingAddress = manager.create(ShippingAddress, {
        order: savedOrder,
        street: sanitizedAddress.street || shippingAddressData.street,
        city: sanitizedAddress.city || shippingAddressData.city,
        state: sanitizedAddress.state || shippingAddressData.state,
        zip_code: sanitizedAddress.zipCode || shippingAddressData.zipCode,
        country: sanitizedAddress.country || shippingAddressData.country,
      });

      await manager.save(shippingAddress);

      return savedOrder;
    });
  }

  /**
   * Cria lista de OrderItems a partir dos inputs
   */
  private createOrderItems(
    items: OrderItemInput[],
    productsMap: Map<string, Product>,
    sizeNamesMap: Map<string, string>,
  ): OrderItem[] {
    return items.map((item) => {
      const product = productsMap.get(item.productId)!;
      const sizeName = sizeNamesMap.get(item.size)!;
      const itemTotalPrice = product.price_cents * item.quantity;

      return this.orderItemRepository.create({
        product,
        quantity: item.quantity,
        unit_price: product.price_cents,
        total_price: itemTotalPrice,
        size: sizeName,
      });
    });
  }
}
