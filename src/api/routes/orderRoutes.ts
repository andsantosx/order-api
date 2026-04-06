import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { validate } from '../middlewares/validate';
import { createOrderSchema, updateStatusSchema } from '../schemas/orderSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';
import { optionalAuthMiddleware } from '../middlewares/optionalAuthMiddleware';
import { recaptchaMiddleware } from '../middlewares/recaptchaMiddleware';
import { orderLimiter } from '../../config/rateLimits';

const router = Router();
const orderController = new OrderController();

// Use bind to ensure 'this' context is preserved
router.get('/', authMiddleware, orderController.getAll.bind(orderController));
router.get('/:id', authMiddleware, orderController.getOne.bind(orderController));
// POST /orders is public (Guest Checkout) but rate limited to prevent spam
router.post(
  '/',
  orderLimiter,
  recaptchaMiddleware,
  optionalAuthMiddleware,
  validate(createOrderSchema),
  orderController.create.bind(orderController),
);
router.patch(
  '/:id/status',
  authMiddleware,
  adminMiddleware,
  auditMiddleware,
  validate(updateStatusSchema),
  orderController.updateStatus.bind(orderController),
);
router.post(
  '/:id/refund',
  authMiddleware,
  adminMiddleware,
  auditMiddleware,
  orderController.refund.bind(orderController),
);
router.post('/:id/cancel', authMiddleware, orderController.cancel.bind(orderController));

export default router;
