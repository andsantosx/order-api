import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { paymentLimiter } from '../../config/rateLimits';

import { validate } from '../middlewares/validate';
import { processPaymentSchema } from '../validations/payment.schema';

const router = Router();
const paymentController = new PaymentController();

// POST /api/payments/process - Process a payment via Mercado Pago (rate limited + strictly validated)
router.post(
  '/process',
  paymentLimiter,
  validate(processPaymentSchema),
  paymentController.processPayment.bind(paymentController),
);

// POST /api/payments/webhook - Handle Mercado Pago Notifications (no rate limit - external service)
router.post('/webhook', paymentController.handleWebhook.bind(paymentController));

export default router;
