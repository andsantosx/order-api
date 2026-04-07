import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';
import { validate } from '../middlewares/validate';
import { createProductSchema, updateProductSchema } from '../schemas/productSchemas';

const router = Router();
const productController = new ProductController();

// Public routes
router.get('/', productController.getAll.bind(productController));
router.get('/filters', productController.getFilters.bind(productController));
router.get('/:id', productController.getOne.bind(productController));

// Admin routes
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('CREATE_PRODUCT'),
  validate(createProductSchema),
  productController.create.bind(productController),
);
router.patch(
  '/:id',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('UPDATE_PRODUCT'),
  validate(updateProductSchema),
  productController.update.bind(productController),
);

export default router;
