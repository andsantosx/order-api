import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';

export class ProductController {
  private productService = new ProductService();

  async getAll(req: Request, res: Response, next: NextFunction) {
    const products = await this.productService.getAll();
    res.json(products);
  }

  async create(req: Request, res: Response, next: NextFunction) {
    const results = await this.productService.create(req.body);
    res.status(201).json(results);
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const product = await this.productService.getOne(id as string);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  }
}
