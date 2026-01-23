import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();
const paymentController = new PaymentController();

// POST /api/payments/create-intent - Creates a Stripe Payment Intent for an order
router.post('/create-intent', paymentController.createPaymentIntent.bind(paymentController));

// POST /api/payments/webhook - Handles webhooks from Stripe
router.post('/webhook', paymentController.handleWebhook.bind(paymentController));

export default router;
