import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService';
import { WebhookQuery, WebhookBody } from '../../types/payment';
import { log } from '../../config/logger';

export class PaymentController {
  private paymentService = new PaymentService();

  /**
   * Processa um novo pagamento
   */
  async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId, ...paymentData } = req.body;
      const result = await this.paymentService.processPayment(orderId, paymentData);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trata notificações de webhook do Mercado Pago
   * Delegando a validação de assinatura e processamento ao Service
   */
  async handleWebhook(req: Request, res: Response, _next: NextFunction) {
    try {
      const xSignature = req.headers['x-signature'] as string;
      const xRequestId = req.headers['x-request-id'] as string;
      
      const query = req.query as unknown as WebhookQuery;
      const body = req.body as WebhookBody;

      log.info('Requisição de webhook recebida', { 
        topic: query.topic || query.type || body.type,
        hasSignature: !!xSignature 
      });

      // O Service agora cuida da verificação HMAC e processamento
      await this.paymentService.receiveWebhook(
        query, 
        body, 
        xSignature, 
        xRequestId
      );

      // Mercado Pago exige resposta 200/201 para não reenviar
      return res.status(200).send('OK');
    } catch (error) {
      log.error('Erro no controller de webhook:', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Mesmo com erro interno, retornamos 200 para o MP parar de tentar se for erro de lógica
      // Se for erro crítico, o ideal é logar e monitorar
      return res.status(200).send('OK');
    }
  }
}
