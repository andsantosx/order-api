import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import { Payment, PaymentRefund } from 'mercadopago';
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

        try {
            const payment = new Payment(client);

            // Normalize payment data (handle potential formData wrapper from frontend)
            const rawData = paymentData.formData || paymentData;

            // Enhanced validation
            const email = rawData.payer?.email || paymentData.payer?.email || order.user?.email || order.guest_email;
            if (!email) {
                throw new AppError('Payer email is required', 400);
            }

            const docType = rawData.payer?.identification?.type || 'CPF';
            const docNumber = rawData.payer?.identification?.number || paymentData.payer?.identification?.number;

            if (!docNumber) {
                throw new AppError('Payer identification number is required', 400);
            }

            const paymentBody: any = {
                transaction_amount: Number(order.total_amount) / 100, // Converts cents (4990) to decimal (49.90)
                description: `Order ${order.id} - ${paymentData.description || 'Purchase'}`,
                payment_method_id: rawData.payment_method_id,
                payer: {
                    email: email,
                    identification: {
                        type: docType,
                        number: docNumber,
                    },
                    first_name: rawData.payer?.first_name || '',
                    last_name: rawData.payer?.last_name || ''
                },
                metadata: {
                    order_id: order.id,
                },
            };

            // Enhanced optional fields mapping for Bricks
            if (rawData.token) paymentBody.token = rawData.token;
            // Default installments to 1 if not provided (crucial for Debit Cards)
            paymentBody.installments = rawData.installments ? Number(rawData.installments) : 1;
            if (rawData.issuer_id) paymentBody.issuer_id = String(rawData.issuer_id);

            console.log('Processing payment with Mercado Pago:', JSON.stringify(paymentBody, null, 2));

            const result = await payment.create({
                body: paymentBody,
                requestOptions: { idempotencyKey: `order_${order.id}_${Date.now()}` }
            });

            console.log('Mercado Pago Payment Result:', result);

            if (result.status === 'approved') {
                // Save payment_id and update status
                await this.orderRepository.update({ id: orderId }, {
                    status: OrderStatus.PAID,
                    payment_id: result.id?.toString()
                });
            } else if (result.id) {
                // Even if not approved yet, save the payment_id for future reference
                await this.orderRepository.update({ id: orderId }, {
                    payment_id: result.id?.toString()
                });
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

    async refundPayment(orderId: string) {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) throw new AppError('Order not found', 404);

        if (order.status !== OrderStatus.PAID) {
            throw new AppError('Only PAID orders can be refunded', 400);
        }

        if (!order.payment_id) {
            throw new AppError('No usage of payment_id found for this order. Cannot refund automatically.', 400);
        }

        try {
            const refundClient = new PaymentRefund(client);
            console.log(`Attempting to refund payment ${order.payment_id} for order ${order.id}`);

            // Execute refund in Mercado Pago
            const refund = await refundClient.create({ payment_id: order.payment_id });

            if (refund.status === 'approved' || refund.status === 'refunded' || (refund as any).status === 'null') { // SDK sometimes returns varying statuses
                await this.orderRepository.update({ id: orderId }, { status: OrderStatus.REFUNDED });
                return { success: true, message: 'Refund processed successfully', external_reference: refund.id };
            } else {
                throw new AppError(`Refund failed with status: ${refund.status}`, 500);
            }

        } catch (error: any) {
            console.error('Refund Error:', error);
            throw new AppError(`Refund failed: ${error.message}`, 500);
        }
    }

    async cancelOrder(orderId: string, userId: string, isAdmin: boolean = false) {
        const order = await this.orderRepository.findOne({ where: { id: orderId }, relations: ['user'] });
        if (!order) throw new AppError('Order not found', 404);

        // Security check: User can only cancel their own orders
        if (!isAdmin && order.user?.id !== userId && order.guest_email !== userId) { // simplistic guest check
            if (order.user?.id !== userId) { // Strict check for logged users
                throw new AppError('Unauthorized', 403);
            }
        }

        if (order.status === OrderStatus.PAID) {
            throw new AppError('Cannot cancel a PAID order. Please request a refund.', 400);
        }

        if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
            throw new AppError('Cannot cancel an order that is already in progress.', 400);
        }

        if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.REFUNDED) {
            return { success: true, message: 'Order is already canceled' };
        }

        // If it brings a payment_id (e.g. pending pix), try to cancel it in MP too?
        if (order.payment_id) {
            try {
                const paymentClient = new Payment(client);
                await paymentClient.cancel({ id: order.payment_id });
            } catch (e) {
                console.warn('Failed to cancel payment in MP, but proceeding with local cancel:', e);
            }
        }

        await this.orderRepository.update({ id: orderId }, { status: OrderStatus.CANCELED });
        return { success: true, message: 'Order canceled successfully' };
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

                // Update payment_id if missing
                await this.orderRepository.update({ id: orderId }, { payment_id: paymentId.toString() });

                if (status === 'approved') {
                    await this.orderRepository.update({ id: orderId }, { status: OrderStatus.PAID });
                    console.log(`Order ${orderId} updated to PAID via Webhook/IPN`);
                } else if (status === 'refunded' || status === 'charged_back') {
                    await this.orderRepository.update({ id: orderId }, { status: OrderStatus.REFUNDED });
                    console.log(`Order ${orderId} updated to REFUNDED via Webhook/IPN`);
                } else if (status === 'cancelled' || status === 'rejected') {
                    // Only cancel if it was pending? Strategy decision.
                    const order = await this.orderRepository.findOne({ where: { id: orderId } });
                    if (order && order.status !== OrderStatus.PAID) {
                        await this.orderRepository.update({ id: orderId }, { status: OrderStatus.CANCELED });
                    }
                }
            }

            return { status: 'ok' };

        } catch (error) {
            console.error('Error processing webhook:', error);
            return { status: 'error', error };
        }
    }
}
