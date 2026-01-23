import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();
const paymentController = new PaymentController();

// POST /api/payments/create-intent - Creates a Stripe Payment Intent for an order
// Esta rota espera um corpo JSON, então será processada pelo express.json()
router.post('/create-intent', paymentController.createPaymentIntent.bind(paymentController));

// A rota de webhook será tratada diretamente no server.ts com um middleware específico.

export default router;
