import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/AddressService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class AddressController {
  async list(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.userId;
    if (!userId) return; // Middleware validation assumed
    const addresses = await this.addressService.list(userId);
    res.json(addresses);
  }

  async create(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.userId;
    if (!userId) return;
    const address = await this.addressService.create(userId, req.body);
    res.status(201).json(address);
  }

  async delete(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return;

    await this.addressService.delete(userId, id as string);
    res.status(204).send();
  }

  constructor(@inject(AddressService) private addressService: AddressService) {}
}
