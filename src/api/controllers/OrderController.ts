import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';

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
    const { guestEmail, items, shippingAddress } = req.body;
    const order = await this.orderService.create(guestEmail, items, shippingAddress);
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
}
