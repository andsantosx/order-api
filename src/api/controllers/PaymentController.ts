import { Request, Response } from 'express';
import { stripe } from '../../config/stripe';
import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import Stripe from 'stripe';

export class PaymentController {
  private orderRepository = AppDataSource.getRepository(Order);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Creates a Stripe Payment Intent for a given order.
   * This endpoint is called after an order is created with 'PENDING' status.
   */
  async createPaymentIntent(req: Request, res: Response) {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['user']
      });

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Find or create a Stripe customer
      let stripeCustomerId: string | undefined;
      if (order.user) {
        const user = await this.userRepository.findOneBy({ id: order.user.id });
        if (user?.stripe_customer_id) {
          stripeCustomerId = user.stripe_customer_id;
        } else if (user) {
          const customer = await stripe.customers.create({ email: user.email });
          stripeCustomerId = customer.id;
          // Save the new customer ID to the user
          user.stripe_customer_id = stripeCustomerId;
          await this.userRepository.save(user);
        }
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.total_amount, // Amount in cents
        currency: order.currency.toLowerCase(),
        customer: stripeCustomerId,
        metadata: {
          order_id: order.id,
        },
      });

      return res.status(201).json({
        clientSecret: paymentIntent.client_secret,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: 'Error creating Payment Intent', error: message });
    }
  }

  /**
   * Handles incoming webhooks from Stripe to update order status.
   */
  async handleWebhook(req: Request, res: Response) {
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

        try {
          const order = await this.orderRepository.findOneBy({ id: orderId });
          if (order) {
            order.status = 'CONFIRMED';
            await this.orderRepository.save(order);
            console.log(`Order ${orderId} status updated to CONFIRMED.`);
          } else {
            console.error(`Order with ID ${orderId} not found.`);
          }
        } catch (dbError) {
          console.error('Error updating order status in database:', dbError);
          // Optionally, you could retry or queue this update
        }
        break;

      case 'payment_intent.payment_failed':
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed for order ${paymentIntentFailed.metadata.order_id}.`);
        // Optionally, update order status to 'FAILED'
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  }
}
