import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { validate } from '../middlewares/validate';
import { createCategorySchema, updateCategorySchema } from '../schemas/categorySchemas';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const categoryController = new CategoryController();

// Public routes
router.get('/', categoryController.getAll.bind(categoryController));
router.get('/:id', categoryController.getOne.bind(categoryController));
router.get('/slug/:slug', categoryController.getBySlug.bind(categoryController));

// Admin routes
router.post('/', authMiddleware, validate(createCategorySchema), categoryController.create.bind(categoryController));
router.put('/:id', authMiddleware, validate(updateCategorySchema), categoryController.update.bind(categoryController));
router.delete('/:id', authMiddleware, categoryController.delete.bind(categoryController));

export default router;
