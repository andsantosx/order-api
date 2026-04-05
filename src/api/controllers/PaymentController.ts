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
   * Endpoint central de processamento de pagamentos
   */
  public process = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentData = req.body;
      
      // Log seguro (removendo sensíveis) para auditoria básica
      log.info(`[PaymentController] Recebendo tentativa de pagamento para: ${paymentData.externalReference || paymentData.metadata?.orderId}`);

      const result = await this.paymentService.processPayment(paymentData);

      return res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        data: result
      });
    } catch (error: any) {
      // Capturamos nossas exceções de domínio e retornamos o status correto
      if (error instanceof PaymentException) {
        log.warn(`[PaymentController] Erro de domínio: ${error.message} (${error.statusCode})`);
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
          code: error.code
        });
      }

      // Erros genéricos ou inesperados continuam p/ o middleware global
      log.error('[PaymentController] Erro inesperado:', error);
      next(error);
    }
  };
}
