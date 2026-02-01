import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';
import { PaymentService } from '../services/PaymentService';

export class OrderController {
  private orderService = new OrderService();

  /**
   * Retorna todos os pedidos cadastrados.
   * Útil para painel administrativo.
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin;
    const orders = await this.orderService.getAll(userId, isAdmin);
    res.json(orders);
  }

  /**
   * Busca um pedido específico pelo ID.
   * Retorna detalhes completos incluindo itens e usuário.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const order = await this.orderService.getOne(id as string);
    res.json(order);
  }

  /**
   * Cria um novo pedido.
   * Espera receber: guestEmail, items e shippingAddress.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    const { guestEmail, guestCpf, items, shippingAddress } = req.body;
    const userId = req.user?.userId;
    const order = await this.orderService.create(userId, guestEmail, guestCpf, items, shippingAddress);
    res.status(201).json(order);
  }

  /**
   * Atualiza o status do pedido.
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { status } = req.body;
    const order = await this.orderService.updateStatus(id as string, status);
    res.json(order);
  }

  /**
   * Reembolsa um pedido pago (Apenas Admin).
   */
  async refund(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    // Check if user is admin (Extra safeguard, middleware should handle this)
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
      const paymentService = new PaymentService();
      const result = await paymentService.refundPayment(id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancela um pedido (Usuário dono ou Admin).
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin || false;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const paymentService = new PaymentService();
      const result = await paymentService.cancelOrder(id as string, userId, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
