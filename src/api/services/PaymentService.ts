import { AppDataSource } from '../../data-source';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import { Payment } from 'mercadopago';
import { client } from '../../config/mercadopago';


export class PaymentService {
    private orderRepository = AppDataSource.getRepository(Order);
    private userRepository = AppDataSource.getRepository(User);

    async processPayment(orderId: string, paymentData: any) {
        if (!orderId) {
            throw new AppError('Order ID is required', 400);
        }

        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['user'],
        });

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        const payment = new Payment(client);

        try {
            const paymentBody: any = {
                transaction_amount: paymentData.transaction_amount,
                description: `Order ${order.id}`,
                payment_method_id: paymentData.payment_method_id,
                payer: {
                    email: paymentData.payer.email || order.user?.email || 'test@test.com', // Fallback or strict content
                    identification: {
                        type: paymentData.payer.identification.type,
                        number: paymentData.payer.identification.number,
                    },
                },
                metadata: {
                    order_id: order.id,
                },
            };

            // Campos opcionais (ex: Pix não tem token)
            if (paymentData.token) paymentBody.token = paymentData.token;
            if (paymentData.installments) paymentBody.installments = paymentData.installments;
            if (paymentData.issuer_id) paymentBody.issuer_id = paymentData.issuer_id;

            const result = await payment.create({
                body: paymentBody,
            });

            if (result.status === 'approved' || result.status === 'in_process') {
                // Update order status if needed, or wait for webhook
                // For bricks, usually immediate response is useful
            }

            return result;
        } catch (error) {
            console.error('Mercado Pago Error:', error);
            throw new AppError('Payment processing failed', 500);
        }
    }

    async receiveWebhook(query: any, body: any) {
        let paymentId = query.id || query['data.id'] || body?.data?.id || body?.id;
        let type = query.type || query.topic || body?.type;

        if (type === 'test') return { status: 'ok' };

        if (!paymentId && body?.action === 'payment.created') {
            paymentId = body.data.id;
        }

        if (!paymentId) {
            return { status: 'ignored' };
        }

        try {
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id: paymentId });

            if (payment && payment.metadata && payment.metadata.order_id) {
                const orderId = payment.metadata.order_id;
                const status = payment.status;

                if (status === 'approved') {
                    await this.orderRepository.update({ id: orderId }, { status: 'PAID' });
                    console.log(`Order ${orderId} updated to PAID via Webhook/IPN`);
                }
            }

            return { status: 'ok' };

        } catch (error) {
            console.error('Error processing webhook:', error);
            return { status: 'error', error };
        }
    }
}
