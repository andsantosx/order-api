import Stripe from 'stripe';
import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { StripeCheckoutSession } from '../entities/StripeCheckoutSession';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-12-15.clover' });

export class PaymentService {
    private orderRepository = AppDataSource.getRepository(Order);
    private sessionRepository = AppDataSource.getRepository(StripeCheckoutSession);
    private userRepository = AppDataSource.getRepository(User);

    async createPaymentIntent(orderId: string) {
        if (!orderId) {
            throw new AppError('ID do pedido é obrigatório', 400);
        }

        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['user', 'items', 'items.product'],
        });

        if (!order) {
            throw new AppError('Pedido não encontrado', 404);
        }

        let customerId: string | undefined;
        if (order.user) {
            const user = await this.userRepository.findOneBy({ id: order.user.id });
            if (user && !user.stripe_customer_id) {
                const customer = await stripe.customers.create({ email: user.email });
                user.stripe_customer_id = customer.id;
                await this.userRepository.save(user);
                customerId = customer.id;
            } else if (user) {
                customerId = user.stripe_customer_id;
            }
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: order.total_amount,
            currency: order.currency.toLowerCase(),
            customer: customerId,
            metadata: { order_id: order.id },
        });

        const session = this.sessionRepository.create({
            order: order,
            stripe_intent_id: paymentIntent.id,
            client_secret: paymentIntent.client_secret || '',
            status: paymentIntent.status,
            amount_cents: paymentIntent.amount,
        });

        await this.sessionRepository.save(session);

        return {
            clientSecret: paymentIntent.client_secret,
            amount: paymentIntent.amount,
        };
    }

    async handleWebhookEvent(event: Stripe.Event) {
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const orderId = paymentIntent.metadata.order_id;

            if (orderId) {
                await this.orderRepository.update({ id: orderId }, { status: 'PAID' });
            }
        }
    }
}
