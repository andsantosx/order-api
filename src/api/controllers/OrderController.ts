import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';

export class OrderController {
  private orderService = new OrderService();

  async getAll(req: Request, res: Response, next: NextFunction) {
    const orders = await this.orderService.getAll();
    res.json(orders);
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const order = await this.orderService.getOne(id as string);
    res.json(order);
  }

  async create(req: Request, res: Response, next: NextFunction) {
    const { guestEmail, items, shippingAddress } = req.body;
    const order = await this.orderService.create(guestEmail, items, shippingAddress);
    res.status(201).json(order);
  }
}
