import { Router } from 'express';
import { BrandController } from '../controllers/BrandController';
import { validate } from '../middlewares/validate';
import { createBrandSchema, updateBrandSchema } from '../schemas/brandSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';

const router = Router();
const brandController = new BrandController();

// Public routes
router.get('/', brandController.getAll.bind(brandController));
router.get('/:id', brandController.getOne.bind(brandController));
router.get('/slug/:slug', brandController.getBySlug.bind(brandController));

// Admin routes
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('CREATE_BRAND'),
  validate(createBrandSchema),
  brandController.create.bind(brandController),
);
router.patch(
  '/:id',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('UPDATE_BRAND'),
  validate(updateBrandSchema),
  brandController.update.bind(brandController),
);

export default router;
