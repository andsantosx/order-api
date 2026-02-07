import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { paymentLimiter } from '../../config/rateLimits';

const router = Router();
const paymentController = new PaymentController();

// POST /api/payments/process - Process a payment via Mercado Pago (rate limited)
router.post('/process', paymentLimiter, paymentController.processPayment.bind(paymentController));

// POST /api/payments/webhook - Handle Mercado Pago Notifications (no rate limit - external service)
router.post('/webhook', paymentController.handleWebhook.bind(paymentController));

export default router;
