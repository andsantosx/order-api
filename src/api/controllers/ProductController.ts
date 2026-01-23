import { Request, Response } from 'express';
import { AppDataSource } from '../../data-source';
import { Product } from '../entities/Product';

export class ProductController {
  private productRepository = AppDataSource.getRepository(Product);

  async getAll(req: Request, res: Response) {
    try {
      const products = await this.productRepository.find();
      return res.json(products);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: 'Error fetching products', error: message });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      const product = await this.productRepository.findOneBy({ id });
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(product);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: 'Error fetching product', error: message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const newProduct = this.productRepository.create(req.body);
      await this.productRepository.save(newProduct);
      return res.status(201).json(newProduct);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: 'Error creating product', error: message });
    }
  }
}
