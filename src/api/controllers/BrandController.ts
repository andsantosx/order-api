import { Request, Response, NextFunction } from 'express';
import { BrandService } from '../services/BrandService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class BrandController {
  /**
   * Retorna todas as marcas cadastradas.
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await this.brandService.getAll();
      res.json(brands);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca uma marca pelo ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const brand = await this.brandService.getOne(parseInt(id as string));
      res.json(brand);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca uma marca pelo Slug.
   */
  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const brand = await this.brandService.getBySlug(slug as string);
      res.json(brand);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cria uma nova marca.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, slug } = req.body;
      const brand = await this.brandService.create(name, slug);
      res.status(201).json(brand);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza uma marca existente.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const brand = await this.brandService.update(parseInt(id as string), req.body);
      res.json(brand);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove uma marca pelo ID.
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.brandService.delete(parseInt(id as string));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  constructor(@inject(BrandService) private brandService: BrandService) {}
}
