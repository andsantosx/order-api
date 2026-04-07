import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService';
import { log } from '../../config/logger';
import { HTTP_STATUS } from '../../constants';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * POST /api/payments/process
   *
   * Processa o pagamento via Checkout Transparente do Mercado Pago.
   * Resposta inclui status, statusDetail, e dados do PIX/QR Code quando aplicável.
   */
  async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentData = req.body;

      log.info('[PaymentController] Payment attempt received', {
        orderId: paymentData.orderId ?? paymentData.externalReference,
        method:  paymentData.paymentMethodId ?? paymentData.payment_method_id,
        userId:  req.user?.userId,
      });

      const result = await this.paymentService.processPayment(req.body);

      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/webhook
   *
   * Recebe notificações IPN (Instant Payment Notification) do Mercado Pago.
   * Sincroniza automaticamente o status do pedido quando chamado.
   *
   * Importante: Sempre retornar 200 rapidamente para o MP não retentar.
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      log.info('[Webhook] Notification received', {
        type:   req.body.type,
        dataId: req.body.data?.id,
      });

      const result = await this.paymentService.handleWebhook(req.body);

      return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/:paymentId
   *
   * Consulta o status e detalhes de um pagamento no Mercado Pago.
   * Admin only — não expor dados financeiros a usuários comuns.
   */
  async getPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentId = parseInt(String(req.params.paymentId), 10);

      if (isNaN(paymentId)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          status:  'error',
          message: 'ID de pagamento deve ser um número válido',
        });
      }

      const payment = await this.paymentService.getPayment(paymentId);

      return res.status(HTTP_STATUS.OK).json(payment);
    } catch (error) {
      next(error);
    }
  }
}
