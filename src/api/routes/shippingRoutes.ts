import { container } from 'tsyringe';
import { Router } from 'express';
import { ShippingController } from '../controllers/ShippingController';

const router = Router();
const shippingController = container.resolve(ShippingController);

/**
 * @swagger
 * /api/shipping/lookup/{cep}:
 *   get:
 *     summary: Busca endereço por CEP
 *     tags: [Shipping]
 *     parameters:
 *       - in: path
 *         name: cep
 *         required: true
 *         schema:
 *           type: string
 *         description: CEP com 8 dígitos
 */
router.get('/lookup/:cep', shippingController.lookupAddress.bind(shippingController));

export default router;
