import { Request, Response, NextFunction } from 'express';
import { stripe } from '../../config/stripe';
import { PaymentService } from '../services/PaymentService';
import Stripe from 'stripe';

export class PaymentController {
  private paymentService = new PaymentService();

  async createPaymentIntent(req: Request, res: Response, next: NextFunction) {
    const { orderId } = req.body;
    // Let the service handle validation
    const result = await this.paymentService.createPaymentIntent(orderId);
    return res.status(201).json(result);
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error('Stripe signature or webhook secret is missing.');
      return res.status(400).send('Webhook Error: Missing signature or secret.');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Webhook signature verification failed: ${message}`);
      return res.status(400).send(`Webhook Error: ${message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.order_id;
        console.log(`PaymentIntent for order ${orderId} was successful!`);
        await this.paymentService.confirmOrderPayment(orderId);
        break;

      case 'payment_intent.payment_failed':
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed for order ${paymentIntentFailed.metadata.order_id}.`);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
}
