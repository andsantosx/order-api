import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { validate } from '../middlewares/validate';
import {
  createOrderSchema,
  updateStatusSchema,
  markShippedSchema,
  markStatusSchema,
} from '../schemas/orderSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';
import { optionalAuthMiddleware } from '../middlewares/optionalAuthMiddleware';
import { recaptchaMiddleware } from '../middlewares/recaptchaMiddleware';
import { orderLimiter } from '../../config/rateLimits';

const router = Router();
const orderController = new OrderController();

// ============================================================
// Rotas do Usuário (autenticado)
// ============================================================

/** GET /orders - Lista pedidos do usuário autenticado (admin vê todos) */
router.get('/', authMiddleware, orderController.getAll.bind(orderController));

/** GET /orders/:id - Detalhes de um pedido */
router.get('/:id', authMiddleware, orderController.getOne.bind(orderController));

/** GET /orders/:id/history - Histórico de mudanças de status */
router.get('/:id/history', authMiddleware, orderController.getStatusHistory.bind(orderController));

/** POST /orders - Criar novo pedido (público, com rate limit e reCAPTCHA) */
router.post(
  '/',
  orderLimiter,
  recaptchaMiddleware,
  optionalAuthMiddleware,
  validate(createOrderSchema),
  orderController.create.bind(orderController),
);

/** POST /orders/:id/cancel - Cancelar pedido (usuário: só PENDING; admin: qualquer estado válido) */
router.post('/:id/cancel', authMiddleware, orderController.cancel.bind(orderController));

// ============================================================
// Rotas Admin - Controle genérico de status
// ============================================================

/**
 * PATCH /orders/:id/status - Atualiza qualquer status válido (admin)
 * Body: { status: number, notes?: string, trackingCode?: string, trackingUrl?: string }
 */
router.patch(
  '/:id/status',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('UPDATE_ORDER_STATUS'),
  validate(updateStatusSchema),
  orderController.updateStatus.bind(orderController),
);

// ============================================================
// Rotas Admin - Atalhos semânticos de logística
// ============================================================

/**
 * PATCH /orders/:id/mark-awaiting-shipment
 * Marca pedido como "Aguardando Envio" (separação em estoque).
 * Pedido deve estar PAID.
 */
router.patch(
  '/:id/mark-awaiting-shipment',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('MARK_ORDER_AWAITING_SHIPMENT'),
  validate(markStatusSchema),
  orderController.markAwaitingShipment.bind(orderController),
);

/**
 * PATCH /orders/:id/mark-shipped
 * Marca pedido como "Enviado". trackingCode obrigatório.
 * Body: { trackingCode: string, trackingUrl?: string, notes?: string }
 */
router.patch(
  '/:id/mark-shipped',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('MARK_ORDER_SHIPPED'),
  validate(markShippedSchema),
  orderController.markShipped.bind(orderController),
);

/**
 * PATCH /orders/:id/mark-delivered
 * Marca pedido como "Entregue".
 */
router.patch(
  '/:id/mark-delivered',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('MARK_ORDER_DELIVERED'),
  validate(markStatusSchema),
  orderController.markDelivered.bind(orderController),
);

/**
 * POST /orders/:id/refund - Reembolsar pedido pago (admin)
 */
router.post(
  '/:id/refund',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('REFUND_ORDER'),
  orderController.refund.bind(orderController),
);

export default router;
