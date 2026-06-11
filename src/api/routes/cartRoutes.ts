import { container } from 'tsyringe';
import { Router } from 'express';
import { CartController } from '../controllers/CartController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { syncCartSchema } from '../schemas/cartSchemas';

const router = Router();
const cartController = container.resolve(CartController);

router.use(authMiddleware);

router.get('/', cartController.getCart.bind(cartController));
router.post('/sync', validate(syncCartSchema), cartController.syncCart.bind(cartController));
router.delete('/', cartController.clearCart.bind(cartController));

export default router;
