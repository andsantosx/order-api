import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/NotificationService';
import { NotificationType } from '../entities/Notification';
import { injectable, inject } from 'tsyringe';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';

@injectable()
export class NotificationController {
  constructor(@inject(NotificationService) private notificationService: NotificationService) {}

  async getUserNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const unreadOnly = req.query.unread === 'true';
      const notifications = await this.notificationService.getUserNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const notification = await this.notificationService.markAsRead(id as string, userId);
      res.json(notification);
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await this.notificationService.markAllAsRead(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, content, type, link, sendEmail } = req.body;
      if (!title || !content || !type) {
        throw new AppError('Título, conteúdo e tipo são obrigatórios', HTTP_STATUS.BAD_REQUEST);
      }

      if (!Object.values(NotificationType).includes(type as any)) {
        throw new AppError('Tipo de notificação inválido', HTTP_STATUS.BAD_REQUEST);
      }

      await this.notificationService.broadcastNotification(
        title,
        content,
        type as NotificationType,
        link,
        sendEmail === true || sendEmail === 'true',
      );

      res.json({ message: 'Broadcast enviado com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}
