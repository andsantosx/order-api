import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { stripe } from '../../config/stripe';
import { AppError } from '../middlewares/errorHandler';
// import Stripe from 'stripe'; // If needed for types

export class PaymentService {
    private orderRepository = AppDataSource.getRepository(Order);
    private userRepository = AppDataSource.getRepository(User);

    async createPaymentIntent(orderId: string) {
        if (!orderId) {
            throw new AppError('Order ID is required', 400);
        }

        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['user']
        });

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        let stripeCustomerId: string | undefined;
        if (order.user) {
            const user = await this.userRepository.findOneBy({ id: order.user.id });
            if (user?.stripe_customer_id) {
                stripeCustomerId = user.stripe_customer_id;
            } else if (user) {
                const customer = await stripe.customers.create({ email: user.email });
                stripeCustomerId = customer.id;
                user.stripe_customer_id = stripeCustomerId;
                await this.userRepository.save(user);
            }
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: order.total_amount,
            currency: order.currency.toLowerCase(),
            customer: stripeCustomerId,
            metadata: {
                order_id: order.id,
            },
        });

        return { clientSecret: paymentIntent.client_secret };
    }

    async confirmOrderPayment(orderId: string) {
        const order = await this.orderRepository.findOneBy({ id: orderId });
        if (order) {
            order.status = 'CONFIRMED';
            await this.orderRepository.save(order);
            return order;
        }
        return null;
    }
}
