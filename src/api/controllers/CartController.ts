import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/CartService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class CartController {
  constructor(@inject(CartService) private cartService: CartService) {}

  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId; // authMiddleware garante req.user
      const cart = await this.cartService.getCart(userId);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  }

  async syncCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { items } = req.body;
      const cart = await this.cartService.syncCart(userId, items || []);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await this.cartService.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
