import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { paymentLimiter, webhookLimiter } from '../../config/rateLimits';
import { validate } from '../middlewares/validate';
import { processPaymentSchema } from '../validations/payment.schema';
import { optionalAuthMiddleware } from '../middlewares/optionalAuthMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';

const router = Router();
const paymentController = new PaymentController();

/**
 * POST /api/payments/process
 *
 * Processa o pagamento via Mercado Pago (Checkout Transparente).
 * Rota pública (guest checkout) mas com auth opcional para usuários logados.
 * Rate limit rigoroso para evitar abuso.
 */
router.post(
  '/process',
  paymentLimiter,
  optionalAuthMiddleware,
  validate(processPaymentSchema),
  paymentController.processPayment.bind(paymentController),
);

/**
 * POST /api/payments/webhook
 *
 * Recebe notificações IPN do Mercado Pago.
 * webhookLimiter: 100 req/min (proteção contra spam, MP reenvia em falha).
 */
router.post('/webhook', webhookLimiter, paymentController.handleWebhook.bind(paymentController));

/**
 * GET /api/payments/:paymentId
 *
 * Consulta o status de um pagamento específico no Mercado Pago.
 * Admin only — não expor dados de pagamento a usuários comuns.
 */
router.get(
  '/:paymentId',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('QUERY_PAYMENT'),
  paymentController.getPayment.bind(paymentController),
);

export default router;
