import { Request, Response, NextFunction } from 'express';
import { VariantService } from '../services/VariantService';

export class VariantController {
    private variantService = new VariantService();

    async getByProduct(req: Request, res: Response, next: NextFunction) {
        const { productId } = req.params;
        const variants = await this.variantService.getByProduct(productId as string);
        res.json(variants);
    }

    async getOne(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const variant = await this.variantService.getOne(id as string);
        res.json(variant);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        const { productId } = req.params;
        const { sizeId, stock, price_cents } = req.body;
        const variant = await this.variantService.create(productId as string, sizeId, stock, price_cents);
        res.status(201).json(variant);
    }

    async updateStock(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const { stock } = req.body;
        const variant = await this.variantService.updateStock(id as string, stock);
        res.json(variant);
    }

    async update(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const variant = await this.variantService.update(id as string, req.body);
        res.json(variant);
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const result = await this.variantService.delete(id as string);
        res.json(result);
    }
}
