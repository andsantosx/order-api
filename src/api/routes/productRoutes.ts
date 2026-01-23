import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

const router = Router();
const productController = new ProductController();

// Usamos .bind() para garantir que o 'this' dentro dos métodos do controller
// seja a instância correta da classe ProductController.
router.get('/', productController.getAll.bind(productController));
router.get('/:id', productController.getOne.bind(productController));
router.post('/', productController.create.bind(productController));

export default router;
