import { Request, Response, NextFunction } from 'express';
import { ShippingService } from '../services/ShippingService';
import { HTTP_STATUS } from '../../constants';
import { injectable, inject } from 'tsyringe';

@injectable()
export class ShippingController {
  /**
   * Busca endereço por CEP
   */
  async lookupAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { cep } = req.params;
      const address = await this.shippingService.lookupAddress(String(cep));

      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  constructor(@inject(ShippingService) private shippingService: ShippingService) {}
}
