import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { validate } from '../middlewares/validate';
import { createCategorySchema, updateCategorySchema } from '../schemas/categorySchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';

const router = Router();
const categoryController = new CategoryController();

// Public routes
router.get('/', categoryController.getAll.bind(categoryController));
router.get('/:id', categoryController.getOne.bind(categoryController));
router.get('/slug/:slug', categoryController.getBySlug.bind(categoryController));

// Admin routes
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  auditMiddleware,
  validate(createCategorySchema),
  categoryController.create.bind(categoryController),
);
router.patch(
  '/:id',
  authMiddleware,
  adminMiddleware,
  auditMiddleware,
  validate(updateCategorySchema),
  categoryController.update.bind(categoryController),
);

export default router;
