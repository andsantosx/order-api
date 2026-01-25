import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { createProductSchema, updateProductSchema } from '../schemas/productSchemas';

const router = Router();
const productController = new ProductController();

// Public routes
router.get('/', productController.getAll.bind(productController));
router.get('/:id', productController.getOne.bind(productController));

// Admin routes
router.post('/', authMiddleware, validate(createProductSchema), productController.create.bind(productController));
router.put('/:id', authMiddleware, validate(updateProductSchema), productController.update.bind(productController));
router.delete('/:id', authMiddleware, productController.delete.bind(productController));

export default router;
