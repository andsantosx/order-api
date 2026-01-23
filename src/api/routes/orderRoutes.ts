import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

const router = Router();
const orderController = new OrderController();

// GET /api/orders - Retrieve a list of all orders
router.get('/', orderController.getAll.bind(orderController));

// GET /api/orders/:id - Get a single order by its ID
router.get('/:id', orderController.getOne.bind(orderController));

// POST /api/orders - Create a new order
router.post('/', orderController.create.bind(orderController));

export default router;
