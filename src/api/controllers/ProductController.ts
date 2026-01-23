import { Request, Response } from 'express';
import { AppDataSource } from '../../data-source';
import { Product } from '../entities/Product';

export class ProductController {
  private productRepository = AppDataSource.getRepository(Product);

  async getAll(req: Request, res: Response) {
    const products = await this.productRepository.find();
    return res.json(products);
  }

  async getOne(req: Request, res: Response) {
    const product = await this.productRepository.findOneBy({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(product);
  }

  async create(req: Request, res: Response) {
    const newProduct = this.productRepository.create(req.body);
    await this.productRepository.save(newProduct);
    return res.status(201).json(newProduct);
  }
}
