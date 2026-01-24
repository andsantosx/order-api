import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/OrderService';

export class OrderController {
  private orderService = new OrderService();

  async getAll(req: Request, res: Response, next: NextFunction) {
    const orders = await this.orderService.getAll();
    res.json(orders);
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id as string;
    const order = await this.orderService.getOne(id);
    res.json(order);
  }

  async create(req: Request, res: Response, next: NextFunction) {
    const items = req.body.items;
    const guestEmail = req.body.guestEmail;
    // We strictly use Guest Checkout now
    const newOrder = await this.orderService.create(guestEmail, items);
    res.status(201).json(newOrder);
  }
}
