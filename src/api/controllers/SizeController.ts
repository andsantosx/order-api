import { Request, Response, NextFunction } from 'express';
import { SizeService } from '../services/SizeService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class SizeController {
  /**
   * Retorna tamanhos disponíveis.
   * Pode filtrar por tipo (ex: 'clothing', 'shoes') via query params.
   */
  async getAll(req: Request, res: Response, _next: NextFunction) {
    const { type } = req.query;
    const sizes = await this.sizeService.getAll(type as string);
    res.json(sizes);
  }

  /**
   * Busca um tamanho pelo ID.
   */
  async getOne(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params;
    const size = await this.sizeService.getOne(parseInt(id as string));
    res.json(size);
  }

  constructor(@inject(SizeService) private sizeService: SizeService) {}
}
