import { Router } from 'express';
import { AddressController } from '../controllers/AddressController';
import { WishlistController } from '../controllers/WishlistController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const addressController = new AddressController();
const wishlistController = new WishlistController();

router.use(authMiddleware);

// Addresses
router.get('/addresses', addressController.list.bind(addressController));
router.post('/addresses', addressController.create.bind(addressController));
router.delete('/addresses/:id', addressController.delete.bind(addressController));

// Wishlist
router.get('/wishlist', wishlistController.list.bind(wishlistController));
router.post('/wishlist/:productId', wishlistController.add.bind(wishlistController)); // Note: Spec says :id but implementation uses body, adapting to param for consistency with spec or body
router.delete('/wishlist/:id', wishlistController.remove.bind(wishlistController));

export default router;
