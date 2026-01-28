import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { validate } from '../middlewares/validate';
import { createOrderSchema, updateStatusSchema } from '../schemas/orderSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const orderController = new OrderController();

// Use bind to ensure 'this' context is preserved
router.get('/', authMiddleware, orderController.getAll.bind(orderController));
router.get('/:id', authMiddleware, orderController.getOne.bind(orderController));
// POST /orders is public (Guest Checkout)
router.post('/', validate(createOrderSchema), orderController.create.bind(orderController));
router.put('/:id/status', authMiddleware, validate(updateStatusSchema), orderController.updateStatus.bind(orderController));

export default router;
