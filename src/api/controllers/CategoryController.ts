import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/CategoryService';

export class CategoryController {
    private categoryService = new CategoryService();

    async getAll(req: Request, res: Response, next: NextFunction) {
        const categories = await this.categoryService.getAll();
        res.json(categories);
    }

    async getOne(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const category = await this.categoryService.getOne(parseInt(id as string));
        res.json(category);
    }

    async getBySlug(req: Request, res: Response, next: NextFunction) {
        const { slug } = req.params;
        const category = await this.categoryService.getBySlug(slug as string);
        res.json(category);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        const { name, slug } = req.body;
        const category = await this.categoryService.create(name, slug);
        res.status(201).json(category);
    }

    async update(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const { name, slug } = req.body;
        const category = await this.categoryService.update(parseInt(id as string), name, slug);
        res.json(category);
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const result = await this.categoryService.delete(parseInt(id as string));
        res.json(result);
    }
}
