import { container } from 'tsyringe';
import { Router } from 'express';
import { CartController } from '../controllers/CartController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const cartController = container.resolve(CartController);

router.use(authMiddleware);

router.get('/', cartController.getCart.bind(cartController));
router.post('/sync', cartController.syncCart.bind(cartController));
router.delete('/', cartController.clearCart.bind(cartController));

export default router;
