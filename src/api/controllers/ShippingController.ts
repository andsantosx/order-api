import { Request, Response, NextFunction } from 'express';
import { ShippingService } from '../services/ShippingService';
import { HTTP_STATUS } from '../../constants';

export class ShippingController {
  private shippingService = new ShippingService();

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
}
