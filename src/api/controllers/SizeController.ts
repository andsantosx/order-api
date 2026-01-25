import { Request, Response, NextFunction } from 'express';
import { SizeService } from '../services/SizeService';

export class SizeController {
    private sizeService = new SizeService();

    async getAll(req: Request, res: Response, next: NextFunction) {
        const { type } = req.query;
        const sizes = await this.sizeService.getAll(type as string);
        res.json(sizes);
    }

    async getOne(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const size = await this.sizeService.getOne(parseInt(id as string));
        res.json(size);
    }
}
