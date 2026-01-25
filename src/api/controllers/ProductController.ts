import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';

export class ProductController {
  private productService = new ProductService();

  /**
   * Retorna produtos com paginação e filtro de categoria.
   * Query Params: category (opcional), page (default 1), limit (default 20).
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    const { category, page, limit } = req.query;
    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? parseInt(limit as string) : 20;

    const products = await this.productService.getAll(category as string, pageNum, limitNum);
    res.json(products);
  }

  /**
   * Busca um produto pelo ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const product = await this.productService.getOne(id as string);
    res.json(product);
  }

  /**
   * Cria um novo produto.
   * Espera: name, price_cents, currency, categoryId, sizeIds.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    const { name, price_cents, currency, categoryId, sizeIds } = req.body;
    const product = await this.productService.create(name, price_cents, currency, categoryId, sizeIds);
    res.status(201).json(product);
  }

  /**
   * Atualiza um produto existente.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const product = await this.productService.update(id as string, req.body);
    res.json(product);
  }

  /**
   * Remove um produto pelo ID.
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const result = await this.productService.delete(id as string);
    res.json(result);
  }
}
