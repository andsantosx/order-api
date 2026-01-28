import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/AddressService';

export class AddressController {
    private addressService = new AddressService();

    async list(req: Request, res: Response, next: NextFunction) {
        const userId = req.user?.userId;
        if (!userId) return; // Middleware validation assumed
        const addresses = await this.addressService.list(userId);
        res.json(addresses);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        const userId = req.user?.userId;
        if (!userId) return;
        const address = await this.addressService.create(userId, req.body);
        res.status(201).json(address);
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId) return;

        await this.addressService.delete(userId, id as string);
        res.status(204).send();
    }
}
