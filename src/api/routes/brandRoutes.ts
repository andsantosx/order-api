import { Router } from 'express';
import { BrandController } from '../controllers/BrandController';
import { validate } from '../middlewares/validate';
import { createBrandSchema, updateBrandSchema } from '../schemas/brandSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const brandController = new BrandController();

// Public routes
router.get('/', brandController.getAll.bind(brandController));
router.get('/:id', brandController.getOne.bind(brandController));
router.get('/slug/:slug', brandController.getBySlug.bind(brandController));

// Admin routes
router.post('/', authMiddleware, validate(createBrandSchema), brandController.create.bind(brandController));
router.put('/:id', authMiddleware, validate(updateBrandSchema), brandController.update.bind(brandController));
router.delete('/:id', authMiddleware, brandController.delete.bind(brandController));

export default router;
