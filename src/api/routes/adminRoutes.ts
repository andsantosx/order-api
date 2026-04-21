import { container } from 'tsyringe';
import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';

const router = Router();
const adminController = container.resolve(AdminController);

// All admin routes require authentication, admin privileges and are audited
router.use(authMiddleware);
router.use(adminMiddleware);
router.use(auditMiddleware());

router.get('/dashboard-stats', adminController.getDashboardStats.bind(adminController));

export default router;
