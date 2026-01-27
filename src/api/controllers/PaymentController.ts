import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/PaymentService';

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

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query;
      const body = req.body;
      console.log('Webhook received:', { query, body });

      await this.paymentService.receiveWebhook(query, body);

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook Error:', error);
      return res.status(200).send('OK');
    }
  }
}
