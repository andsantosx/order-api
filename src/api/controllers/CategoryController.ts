import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/CategoryService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class CategoryController {
  /**
   * Retorna todas as categorias cadastradas.
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await this.categoryService.getAll();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca uma categoria pelo ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await this.categoryService.getOne(parseInt(id as string));
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca uma categoria pelo Slug (nome amigável para URL).
   */
  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const category = await this.categoryService.getBySlug(slug as string);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cria uma nova categoria.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, slug } = req.body;
      const category = await this.categoryService.create(name, slug);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza uma categoria existente.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await this.categoryService.update(parseInt(id as string), req.body);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove uma categoria pelo ID.
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.categoryService.delete(parseInt(id as string));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  constructor(@inject(CategoryService) private categoryService: CategoryService) {}
}
