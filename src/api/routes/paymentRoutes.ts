import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();
const paymentController = new PaymentController();

// POST /api/payments/process - Process a payment via Mercado Pago
router.post('/process', paymentController.processPayment.bind(paymentController));

// POST /api/payments/webhook - Handle Mercado Pago Notifications
router.post('/webhook', paymentController.handleWebhook.bind(paymentController));

export default router;
