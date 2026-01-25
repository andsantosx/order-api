import { Request, Response, NextFunction } from 'express';
import { SizeService } from '../services/SizeService';

export class SizeController {
    private sizeService = new SizeService();

    /**
     * Retorna tamanhos disponíveis.
     * Pode filtrar por tipo (ex: 'clothing', 'shoes') via query params.
     */
    async getAll(req: Request, res: Response, next: NextFunction) {
        const { type } = req.query;
        const sizes = await this.sizeService.getAll(type as string);
        res.json(sizes);
    }

    /**
     * Busca um tamanho pelo ID.
     */
    async getOne(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const size = await this.sizeService.getOne(parseInt(id as string));
        res.json(size);
    }
}
