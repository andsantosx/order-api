import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class ProductController {
  /**
   * Retorna produtos com paginação e filtro de categoria.
   * Query Params: categories (string | string[]), sizes (string | string[]), page, limit, search, minPrice, maxPrice, sort.
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        categories,
        brands,
        sizes,
        page,
        limit,
        search,
        minPrice,
        maxPrice,
        sort,
        sortBy,
        isFeatured,
      } = req.query;
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 20;

      // Helper to ensure array and handle comma separated strings
      const toArray = (val: unknown): string[] | undefined => {
        if (!val) return undefined;
        if (typeof val === 'string') {
          return val.includes(',') ? val.split(',') : [val];
        }
        if (Array.isArray(val)) {
          return val.reduce((acc: string[], curr) => {
            if (typeof curr === 'string') {
              if (curr.includes(',')) acc.push(...curr.split(','));
              else acc.push(curr);
            }
            return acc;
          }, []);
        }
        return undefined;
      };

      const products = await this.productService.getAll({
        categories: toArray(categories),
        brands: toArray(brands),
        sizes: toArray(sizes),
        sortBy: (sort || sortBy) as string,
        page: pageNum,
        limit: limitNum,
        search: search as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      });
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retorna os filtros disponíveis (facetas).
   */
  async getFilters(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = await this.productService.getAvailableFilters();
      res.json(filters);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca um produto pelo ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await this.productService.getOne(id as string);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cria um novo produto.
   * Espera: name, price_cents, currency, categoryId, sizes (array of {sizeId}).
   * Compatibility: supports sizeIds (array of numbers).
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        priceCents,
        price_cents,
        description,
        currency,
        categoryId,
        brandId,
        sizeIds,
        sizes,
        images,
        isFeatured,
        isCustomizable,
      } = req.body;

      const finalPrice = priceCents ?? price_cents;

      let sizesData = sizes;
      if (!sizes && sizeIds) {
        sizesData = sizeIds.map((id: number) => ({ sizeId: id }));
      }

      const product = await this.productService.create(
        name,
        finalPrice,
        description,
        currency,
        categoryId,
        brandId,
        sizesData,
        images,
        isFeatured,
        isCustomizable,
      );
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza um produto existente.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        sizeIds,
        sizes,
        images,
        priceCents,
        price_cents,
        isFeatured,
        isCustomizable,
        ...rest
      } = req.body;
      const finalPrice = priceCents ?? price_cents;

      let sizesData = sizes;
      if (!sizes && sizeIds) {
        sizesData = sizeIds.map((id: number) => ({ sizeId: id }));
      }

      const product = await this.productService.update(id as string, {
        ...rest,
        priceCents: finalPrice,
        sizes: sizesData,
        images,
        isFeatured,
        isCustomizable,
      });
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove um produto pelo ID.
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.productService.delete(id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  constructor(@inject(ProductService) private productService: ProductService) {}
}
