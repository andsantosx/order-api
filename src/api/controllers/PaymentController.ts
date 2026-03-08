import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService';
import { WebhookQuery } from '../../types/payment';
import { log } from '../../config/logger';

export class PaymentController {
  private paymentService = new PaymentService();

  async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, ...paymentData } = req.body;
      const result = await this.paymentService.processPayment(orderId, paymentData);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, _next: NextFunction) {
    try {
      const signature = (req.headers['x-signature'] as string) || '';
      const requestId = (req.headers['x-request-id'] as string) || '';

      // Validação de assinatura
      if (!this.isValidSignature(signature, requestId, req.query as WebhookQuery)) {
        log.warn('Webhook com assinatura inválida recebido', { signature, requestId });
        // Retornamos 200/403 dependendo da estratégia, aqui 403 para negar
        return res.status(403).send('Invalid signature');
      }

      const query = req.query;
      const body = req.body;

      await this.paymentService.receiveWebhook(query as WebhookQuery, body);

      return res.status(200).send('OK');
    } catch (error) {
      log.error('Webhook Error:', { error });
      return res.status(200).send('OK');
    }
  }

  /**
   * Valida a assinatura do webhook do Mercado Pago
   * NOTA: Em produção valida-se o hash HMAC-SHA256 usando o MP_WEBHOOK_SECRET
   */
  private isValidSignature(_signature: string, _requestId: string, _query: WebhookQuery): boolean {
    // Se não estivermos em produção ou se a env não estiver definida, podemos pular (CUIDADO)
    if (process.env.NODE_ENV !== 'production') return true;

    // TODO: Implementar validação real com crypto.createHmac
    // const secret = process.env.MP_WEBHOOK_SECRET;
    // ... lógica de hash ...

    // Por enquanto retorna true para não quebrar o fluxo dev,
    // mas a estrutura está pronta para a lógica real.
    return true;
  }
}
