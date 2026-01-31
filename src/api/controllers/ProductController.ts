import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';

export class ProductController {
  private productService = new ProductService();

  /**
   * Retorna produtos com paginação e filtro de categoria.
   * Query Params: categories (string | string[]), sizes (string | string[]), page, limit, search, minPrice, maxPrice, sort.
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    const { categories, sizes, page, limit, search, minPrice, maxPrice, sort } = req.query;
    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? parseInt(limit as string) : 20;

    // Helper to ensure array
    const toArray = (val: any): string[] | undefined => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val as string[];
      return (val as string).split(',');
    };

    const products = await this.productService.getAll({
      categories: toArray(categories),
      sizes: toArray(sizes),
      sortBy: sort as string,
      page: pageNum,
      limit: limitNum,
      search: search as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined
    });
    res.json(products);
  }

  /**
   * Retorna os filtros disponíveis (facetas).
   */
  async getFilters(req: Request, res: Response, next: NextFunction) {
    const filters = await this.productService.getAvailableFilters();
    res.json(filters);
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
   * Espera: name, price_cents, currency, categoryId, sizes (array of {sizeId, quantity}).
   * Compatibility: supports sizeIds (array of numbers) -> default quantity 0.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    const { name, price_cents, description, currency, categoryId, sizeIds, sizes } = req.body;

    let sizesData = sizes;
    if (!sizes && sizeIds) {
      sizesData = sizeIds.map((id: number) => ({ sizeId: id, quantity: 0 }));
    }

    const product = await this.productService.create(name, price_cents, description, currency, categoryId, sizesData);
    res.status(201).json(product);
  }

  /**
   * Atualiza um produto existente.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { sizeIds, sizes, ...rest } = req.body;

    let sizesData = sizes;
    if (!sizes && sizeIds) {
      sizesData = sizeIds.map((id: number) => ({ sizeId: id, quantity: 0 }));
    }

    const product = await this.productService.update(id as string, { ...rest, sizes: sizesData });
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
