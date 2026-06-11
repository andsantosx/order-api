import { container } from 'tsyringe';
import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const notificationController = container.resolve(NotificationController);

router.use(authMiddleware);

router.get('/', notificationController.getUserNotifications.bind(notificationController));
router.patch('/read-all', notificationController.markAllAsRead.bind(notificationController));
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));

export default router;
