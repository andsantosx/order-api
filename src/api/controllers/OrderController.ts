import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderStatus } from '../entities/Order';
import { PaymentService } from '../services/PaymentService';
import { OrderHistoryService } from '../services/OrderHistoryService';
import { log } from '../../config/logger';
import { HTTP_STATUS, ERROR_MESSAGES, SECURITY } from '../../constants';
import { AppError } from '../middlewares/errorHandler';
import { ChangedByRole } from '../../types/domain-enums';
import { injectable, inject } from 'tsyringe';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

@injectable()
export class OrderController {
  /**
   * GET /orders
   * Retorna todos os pedidos com paginação e filtros.
   * Admins veem todos; usuários veem só os seus.
   * Query: ?status=3&page=1&limit=20&userId=<uuid> (userId só para admin)
   */
  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const isAdmin = req.user?.isAdmin || false;

      // Converter query param para número
      const statusParam = req.query.status as string | undefined;
      const status = statusParam !== undefined ? parseInt(statusParam, 10) : undefined;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string | undefined;

      // Admin pode filtrar por userId específico; usuário sempre vê só os seus
      const queryUserId = req.query.userId as string | undefined;
      const targetUserId = isAdmin ? queryUserId : userId;

      const result = await this.orderService.getAll(
        isAdmin,
        targetUserId,
        status,
        page,
        limit,
        search,
      );
      return res.json(result);
    } catch (error) {
      log.error('Erro ao buscar pedidos', { error });
      throw error;
    }
  }

  /**
   * GET /orders/:id
   * Busca um pedido específico pelo ID.
   */
  async getOne(req: Request, res: Response, _next: NextFunction) {
    const id = String(req.params.id);
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin || false;
    const order = await this.orderService.getOne(id, userId, isAdmin);
    res.json(order);
  }

  /**
   * GET /orders/:id/history
   * Retorna o histórico completo de mudanças de status de um pedido.
   * Usuário só vê o histórico de seus próprios pedidos; admin vê qualquer um.
   */
  async getStatusHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.userId;
      const isAdmin = req.user?.isAdmin || false;

      // Verificar acesso ao pedido antes de retornar histórico
      await this.orderService.getOne(id, userId, isAdmin);

      const history = await OrderHistoryService.getByOrderId(id);
      return res.json(history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /orders
   * Cria um novo pedido. Público com rate limit (Guest Checkout).
   */
  async create(req: Request, res: Response, _next: NextFunction) {
    const {
      guestName,
      guestEmail,
      guestCpf,
      phone,
      items,
      shippingAddress,
      acceptedTerms,
      idempotencyKey,
      paymentMethod,
    } = req.body;
    const userId = req.user?.userId;
    const result = await this.orderService.create(
      userId,
      guestName,
      guestEmail,
      guestCpf,
      phone,
      items,
      shippingAddress,
      acceptedTerms,
      idempotencyKey,
      paymentMethod,
    );

    // Se criou conta automaticamente (guest checkout), faz auto-login
    if (result.isNewUser && result.user) {
      const token = jwt.sign(
        {
          userId: result.user.id,
          email: result.user.email,
          isAdmin: result.user.isAdmin || false,
        },
        env.JWT_SECRET,
        { expiresIn: SECURITY.JWT_EXPIRATION },
      );

      // Define httpOnly cookie para auto-login
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      });

      log.info('Auto-login após criação de conta guest', { userId: result.user.id });
    }

    res.status(HTTP_STATUS.CREATED).json(result);
  }

  /**
   * PATCH /orders/:id/status
   * Atualiza o status de um pedido (apenas admin).
   * Valida automaticamente a máquina de estados.
   * Body: { status: number, notes?: string, trackingCode?: string, trackingUrl?: string }
   */
  async updateStatus(req: Request, res: Response, _next: NextFunction) {
    const id = String(req.params.id);
    const { status, notes, trackingCode, trackingUrl } = req.body;
    const isAdmin = req.user?.isAdmin || false;
    const changedById = req.user?.userId || 'unknown';

    const order = await this.orderService.updateStatus(
      id,
      {
        status,
        changedById,
        changedByRole: ChangedByRole.ADMIN,
        notes,
        trackingCode,
        trackingUrl,
      },
      isAdmin,
    );
    res.json(order);
  }

  // =========================================================
  // Endpoints especializados do Admin (atalhos semânticos)
  // =========================================================

  /**
   * PATCH /orders/:id/mark-awaiting-shipment
   * Marca o pedido como "Aguardando Envio" (separação em estoque).
   * Admin only. Pedido deve estar PAID.
   */
  async markAwaitingShipment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { notes } = req.body;
      const changedById = req.user?.userId || 'unknown';

      const order = await this.orderService.updateStatus(
        id,
        {
          status: OrderStatus.AWAITING_SHIPMENT,
          changedById,
          changedByRole: ChangedByRole.ADMIN,
          notes: notes || 'Pedido em preparação para envio',
        },
        true,
      );
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /orders/:id/mark-shipped
   * Marca o pedido como "Enviado". Código de rastreio é obrigatório.
   * Admin only.
   */
  async markShipped(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { trackingCode, trackingUrl, notes } = req.body;
      const changedById = req.user?.userId || 'unknown';

      if (!trackingCode) {
        throw new AppError(ERROR_MESSAGES.TRACKING_CODE_REQUIRED, HTTP_STATUS.BAD_REQUEST);
      }

      const order = await this.orderService.updateStatus(
        id,
        {
          status: OrderStatus.SHIPPED,
          changedById,
          changedByRole: ChangedByRole.ADMIN,
          notes: notes || 'Pedido enviado ao transportador',
          trackingCode,
          trackingUrl,
        },
        true,
      );
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /orders/:id/mark-delivered
   * Marca o pedido como "Entregue".
   * Admin only.
   */
  async markDelivered(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { notes } = req.body;
      const changedById = req.user?.userId || 'unknown';

      const order = await this.orderService.updateStatus(
        id,
        {
          status: OrderStatus.DELIVERED,
          changedById,
          changedByRole: ChangedByRole.ADMIN,
          notes: notes || 'Entrega confirmada',
        },
        true,
      );
      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /orders/:id/refund
   * Inicia reembolso de um pedido pago (apenas admin).
   */
  async refund(req: Request, res: Response, next: NextFunction) {
    const id = String(req.params.id);

    if (!req.user?.isAdmin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: ERROR_MESSAGES.ORDER_UNAUTHORIZED });
    }

    try {
      const paymentService = this.paymentService;
      const result = await paymentService.refundPayment(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /orders/:id/cancel
   * Cancela um pedido.
   * Usuário: apenas se PENDING.
   * Admin: qualquer estado válido pela máquina de estados.
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    const id = String(req.params.id);
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin || false;

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: ERROR_MESSAGES.INVALID_TOKEN });
    }

    try {
      const paymentService = this.paymentService;
      const result = await paymentService.cancelOrder(id, userId, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  constructor(
    @inject(OrderService) private orderService: OrderService,
    @inject(PaymentService) private paymentService: PaymentService,
  ) {}
}
