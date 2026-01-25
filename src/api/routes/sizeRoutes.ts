import { Router } from 'express';
import { SizeController } from '../controllers/SizeController';

const router = Router();
const sizeController = new SizeController();

// Public routes - apenas leitura
router.get('/', sizeController.getAll.bind(sizeController));
router.get('/:id', sizeController.getOne.bind(sizeController));

export default router;
