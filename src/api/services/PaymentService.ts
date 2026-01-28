import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
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
                transaction_amount: Number(paymentData.transaction_amount),
                description: `Order ${order.id} - ${paymentData.description || 'Purchase'}`,
                payment_method_id: paymentData.payment_method_id,
                payer: {
                    email: paymentData.payer?.email || order.user?.email,
                    identification: {
                        type: paymentData.payer?.identification?.type || 'CPF',
                        number: paymentData.payer?.identification?.number || '00000000000',
                    },
                    first_name: paymentData.payer?.first_name || '',
                    last_name: paymentData.payer?.last_name || ''
                },
                metadata: {
                    order_id: order.id,
                },
            };

            // Enhanced optional fields mapping for Bricks
            if (paymentData.token) paymentBody.token = paymentData.token;
            if (paymentData.installments) paymentBody.installments = Number(paymentData.installments);
            if (paymentData.issuer_id) paymentBody.issuer_id = String(paymentData.issuer_id);

            console.log('Processing payment with Mercado Pago:', JSON.stringify(paymentBody, null, 2));

            const result = await payment.create({
                body: paymentBody,
                requestOptions: { idempotencyKey: `order_${order.id}_${Date.now()}` }
            });

            console.log('Mercado Pago Payment Result:', result);

            if (result.status === 'approved' || result.status === 'in_process') {
                // Immediately update order status if approved to avoid waiting for webhook
                if (result.status === 'approved') {
                    await this.orderRepository.update({ id: orderId }, { status: OrderStatus.PAID });
                }
            }

            return result;
        } catch (error: any) {
            console.error('Mercado Pago Error:', error);
            // Enhance error message for the client
            const errorMessage = error.message || 'Payment processing failed';
            const errorStatus = error.status || 500;
            // Check for specific Mercado Pago API errors
            if (error.cause) {
                console.error('Mercado Pago Error Cause:', JSON.stringify(error.cause, null, 2));
            }
            throw new AppError(`Payment processing failed: ${errorMessage}`, errorStatus);
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
                    await this.orderRepository.update({ id: orderId }, { status: OrderStatus.PAID });
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
