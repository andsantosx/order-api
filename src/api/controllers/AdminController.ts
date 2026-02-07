import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/AdminService';
import { AppError } from '../middlewares/errorHandler';

export class AdminController {
  private adminService = new AdminService();

  async getDashboardStats(req: Request, res: Response, _next: NextFunction) {
    // Enforce Admin Access
    if (!req.user || !req.user.isAdmin) {
      throw new AppError('Acesso negado. Apenas administradores.', 403);
    }

    const { start_date, end_date } = req.query;
    const stats = await this.adminService.getDashboardStats(
      start_date as string,
      end_date as string,
    );
    res.json(stats);
  }
}
