import { container } from 'tsyringe';
import { Router } from 'express';
import { SizeController } from '../controllers/SizeController';

const router = Router();
const sizeController = container.resolve(SizeController);

// Public routes - apenas leitura
router.get('/', sizeController.getAll.bind(sizeController));
router.get('/:id', sizeController.getOne.bind(sizeController));

export default router;
