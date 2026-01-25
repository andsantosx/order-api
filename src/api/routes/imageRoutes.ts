import { Router } from 'express';
import { ImageController } from '../controllers/ImageController';
import { validate } from '../middlewares/validate';
import { createImageSchema } from '../schemas/imageSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const imageController = new ImageController();

// Public routes
router.get('/product/:productId', imageController.getByProduct.bind(imageController));

// Admin routes
router.post('/product/:productId', authMiddleware, validate(createImageSchema), imageController.create.bind(imageController));
router.delete('/:id', authMiddleware, imageController.delete.bind(imageController));

export default router;
