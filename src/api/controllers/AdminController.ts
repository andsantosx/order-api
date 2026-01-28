import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/AdminService';
import { AppError } from '../middlewares/errorHandler';

export class AdminController {
    private adminService = new AdminService();

    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        // Enforce Admin Access
        if (!req.user || !req.user.isAdmin) {
            throw new AppError('Acesso negado. Apenas administradores.', 403);
        }

        const stats = await this.adminService.getDashboardStats();
        res.json(stats);
    }
}
