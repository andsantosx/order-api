import { Request, Response, NextFunction } from 'express';
import { BrandService } from '../services/BrandService';

export class BrandController {
    private brandService = new BrandService();

    /**
     * Retorna todas as marcas cadastradas.
     */
    async getAll(req: Request, res: Response, next: NextFunction) {
        const brands = await this.brandService.getAll();
        res.json(brands);
    }

    /**
     * Busca uma marca pelo ID.
     */
    async getOne(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const brand = await this.brandService.getOne(parseInt(id as string));
        res.json(brand);
    }

    /**
     * Busca uma marca pelo Slug.
     */
    async getBySlug(req: Request, res: Response, next: NextFunction) {
        const { slug } = req.params;
        const brand = await this.brandService.getBySlug(slug as string);
        res.json(brand);
    }

    /**
     * Cria uma nova marca.
     */
    async create(req: Request, res: Response, next: NextFunction) {
        const { name, slug } = req.body;
        const brand = await this.brandService.create(name, slug);
        res.status(201).json(brand);
    }

    /**
     * Atualiza uma marca existente.
     */
    async update(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const { name, slug } = req.body;
        const brand = await this.brandService.update(parseInt(id as string), name, slug);
        res.json(brand);
    }

    /**
     * Remove uma marca pelo ID.
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const result = await this.brandService.delete(parseInt(id as string));
        res.json(result);
    }
}
