import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';

export class ProductController {
  private productService = new ProductService();

  /**
   * Retorna produtos com paginação e filtro de categoria.
   * Query Params: categories (string | string[]), sizes (string | string[]), page, limit, search, minPrice, maxPrice, sort.
   */
  async getAll(req: Request, res: Response, _next: NextFunction) {
    const { categories, brands, sizes, page, limit, search, minPrice, maxPrice, sort } = req.query;
    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? parseInt(limit as string) : 20;

    // Helper to ensure array
    const toArray = (val: unknown): string[] | undefined => {
      if (!val) return undefined;
      if (typeof val === 'string') return [val];
      if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string');
      return undefined;
    };

    const products = await this.productService.getAll({
      categories: toArray(categories),
      brands: toArray(brands),
      sizes: toArray(sizes),
      sortBy: sort as string,
      page: pageNum,
      limit: limitNum,
      search: search as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    res.json(products);
  }

  /**
   * Retorna os filtros disponíveis (facetas).
   */
  async getFilters(req: Request, res: Response, _next: NextFunction) {
    const filters = await this.productService.getAvailableFilters();
    res.json(filters);
  }

  /**
   * Busca um produto pelo ID.
   */
  async getOne(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params;
    const product = await this.productService.getOne(id as string);
    res.json(product);
  }

  /**
   * Cria um novo produto.
   * Espera: name, price_cents, currency, categoryId, sizes (array of {sizeId}).
   * Compatibility: supports sizeIds (array of numbers).
   */
  async create(req: Request, res: Response, _next: NextFunction) {
    const {
      name,
      price_cents,
      description,
      currency,
      categoryId,
      brandId,
      sizeIds,
      sizes,
      images,
    } = req.body;

    let sizesData = sizes;
    if (!sizes && sizeIds) {
      sizesData = sizeIds.map((id: number) => ({ sizeId: id }));
    }

    const product = await this.productService.create(
      name,
      price_cents,
      description,
      currency,
      categoryId,
      brandId,
      sizesData,
      images,
    );
    res.status(201).json(product);
  }

  /**
   * Atualiza um produto existente.
   */
  async update(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params;
    const { sizeIds, sizes, images, ...rest } = req.body;

    let sizesData = sizes;
    if (!sizes && sizeIds) {
      sizesData = sizeIds.map((id: number) => ({ sizeId: id }));
    }

    const product = await this.productService.update(id as string, {
      ...rest,
      sizes: sizesData,
      images,
    });
    res.json(product);
  }

  /**
   * Remove um produto pelo ID.
   */
  async delete(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params;
    const result = await this.productService.delete(id as string);
    res.json(result);
  }
}
