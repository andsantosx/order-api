import { Router } from 'express';
import { SizeController } from '../controllers/SizeController';
import { validate } from '../middlewares/validate';
import { createSizeSchema } from '../schemas/sizeSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const sizeController = new SizeController();

// Public routes
router.get('/', sizeController.getAll.bind(sizeController));
router.get('/:id', sizeController.getOne.bind(sizeController));

// Admin routes
router.post('/', authMiddleware, validate(createSizeSchema), sizeController.create.bind(sizeController));
router.delete('/:id', authMiddleware, sizeController.delete.bind(sizeController));

export default router;
