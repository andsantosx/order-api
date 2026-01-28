import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication
router.use(authMiddleware);

router.get('/dashboard-stats', adminController.getDashboardStats.bind(adminController));

export default router;
