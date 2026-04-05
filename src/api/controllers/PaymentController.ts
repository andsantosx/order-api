import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService';
import { log } from '../../config/logger';
import { HTTP_STATUS } from '../../constants';
import { PaymentException } from '../exceptions/PaymentException';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Processamento de pagamento via Checkout Transparente (Mercado Pago)
   */
  async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentData = req.body;

      // Log seguro (removendo sensíveis) para auditoria básica
      log.info(
        `[PaymentController] Recebendo tentativa de pagamento para: ${paymentData.externalReference || paymentData.metadata?.orderId}`,
      );

      // 2. Chama o serviço (Core Logic)
      const result = await this.paymentService.processPayment(req.body);

      // 3. Resposta padronizada esperada pelo frontend
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Webhook para receber notificações do Mercado Pago
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.paymentService.handleWebhook(req.body);
      return res.status(HTTP_STATUS.OK).json(result);
    } catch (error: any) {
      next(error);
    }
  }
}
