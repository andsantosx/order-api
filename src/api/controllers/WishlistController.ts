import { Request, Response, NextFunction } from 'express';
import { WishlistService } from '../services/WishlistService';

export class WishlistController {
  private wishlistService = new WishlistService();

  async list(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.userId;
    const wishlist = await this.wishlistService.getWishlist(userId);
    // Transform to match spec format if needed
    const formatted = wishlist.map((item) => ({
      id: item.id,
      product: item.product,
      addedAt: item.addedAt,
    }));
    res.json(formatted);
  }

  async add(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.userId;
    const { productId } = req.params;

    if (!productId) {
      res.status(400).json({ message: 'Product ID is required' });
      return;
    }

    const item = await this.wishlistService.addToWishlist(userId, productId as string);
    res.status(201).json(item);
  }

  async remove(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.userId;
    const { id } = req.params;
    await this.wishlistService.removeFromWishlist(userId, id as string);
    res.status(204).send();
  }
}
