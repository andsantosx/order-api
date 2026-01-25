import { Router } from 'express';
import { VariantController } from '../controllers/VariantController';
import { validate } from '../middlewares/validate';
import { createVariantSchema, updateVariantSchema, updateStockSchema } from '../schemas/variantSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const variantController = new VariantController();

// Public routes
router.get('/product/:productId', variantController.getByProduct.bind(variantController));
router.get('/:id', variantController.getOne.bind(variantController));

// Admin routes
router.post('/product/:productId', authMiddleware, validate(createVariantSchema), variantController.create.bind(variantController));
router.patch('/:id', authMiddleware, validate(updateVariantSchema), variantController.update.bind(variantController));
router.patch('/:id/stock', authMiddleware, validate(updateStockSchema), variantController.updateStock.bind(variantController));
router.delete('/:id', authMiddleware, variantController.delete.bind(variantController));

export default router;
