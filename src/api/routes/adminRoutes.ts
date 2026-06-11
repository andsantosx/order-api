import { container } from 'tsyringe';
import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';

const router = Router();
const adminController = container.resolve(AdminController);
const notificationController = container.resolve(NotificationController);

// All admin routes require authentication, admin privileges and are audited
router.use(authMiddleware);
router.use(adminMiddleware);
router.use(auditMiddleware());

router.get('/dashboard-stats', adminController.getDashboardStats.bind(adminController));
router.post(
  '/notifications/broadcast',
  notificationController.broadcast.bind(notificationController),
);

export default router;
