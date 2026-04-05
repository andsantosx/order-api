import { TestDataSource } from '../test-data-source';
// Mock Data Source - MUST be before app import
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

// Mock Mercado Pago SDK
jest.mock('mercadopago', () => {
  const { Payment, PaymentRefund, MercadoPagoConfig } = require('../mocks/mercadopago.mock');
  return { Payment, PaymentRefund, MercadoPagoConfig };
});

import request from 'supertest';
import app from '../../app';
import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../api/entities/Order';
import { Product } from '../../api/entities/Product';
import { Size } from '../../api/entities/Size';
import crypto from 'crypto';

describe('Payment Flow Integration (Mercado Pago)', () => {
  let token: string;
  let orderId: string;
  let product: Product;
  let size: Size;

  beforeAll(async () => {
    // 1. Auth Setup
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Test Payer',
      email: 'payer@test.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      document: '12345678909', // Valid CPF for algorithm
      acceptedTerms: true,
    });
    
    if (registerRes.status !== 201 && registerRes.status !== 409) {
       console.error('Registration failed:', JSON.stringify(registerRes.body, null, 2));
    }

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'payer@test.com',
      password: 'TestPassword123!',
    });
    
    if (loginRes.status !== 200) {
       console.error('Login failed:', JSON.stringify(loginRes.body, null, 2));
    }
    token = loginRes.body.token;

    // 2. Data Setup
    product = await TestDataSource.getRepository(Product).findOneOrFail({ where: { name: 'Nike Air Force 1' } });
    size = await TestDataSource.getRepository(Size).findOneOrFail({ where: { name: '40' } });
  });

  async function createTestOrder(quantity = 1, idempotencyKey?: string) {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity, size: size.id }],
        shippingAddress: {
          zipCode: '01001-000',
          street: 'Praça da Sé',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil'
        },
        acceptedTerms: true,
        idempotencyKey: idempotencyKey || crypto.randomUUID(),
      });
    
    if (res.status !== 201) {
      console.error('Order creation failed:', JSON.stringify(res.body, null, 2));
    }
    return res.body.id;
  }

  it('✅ should process a Credit Card payment successfully', async () => {
    orderId = await createTestOrder(1);

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        paymentMethodId: 'visa',
        token: 'test_token_123',
        installments: 1,
        payer: {
          email: 'payer@test.com',
          identification: { type: 'CPF', number: '12345678909' }
        }
      });

    if (response.status !== 201) {
      console.error('Payment failed:', JSON.stringify(response.body, null, 2));
    }

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('approved');

    // Verify order status update
    const order = await TestDataSource.getRepository(Order).findOneBy({ id: orderId });
    expect(order?.status).toBe(OrderStatus.PAID);
    expect(order?.paymentId).toBeDefined();
  });

  it('✅ should process a PIX payment and return QR Code', async () => {
    orderId = await createTestOrder(2);

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        paymentMethodId: 'pix',
        payer: {
          email: 'payer@test.com',
          identification: { type: 'CPF', number: '12345678909' }
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
    expect(response.body.point_of_interaction.transaction_data.qr_code).toBeDefined();

    // Verify order status remains PENDING for PIX
    const order = await TestDataSource.getRepository(Order).findOneBy({ id: orderId });
    expect(order?.status).toBe(OrderStatus.PENDING);
  });

  it('❌ should cancel order when payment is REJECTED', async () => {
    orderId = await createTestOrder(3);

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        paymentMethodId: 'rejected',
        payer: {
          email: 'payer@test.com',
          identification: { type: 'CPF', number: '12345678909' }
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('rejected');

    const order = await TestDataSource.getRepository(Order).findOneBy({ id: orderId });
    expect(order?.status).toBe(OrderStatus.CANCELLED);
  });

  it('🔔 should update order status via Webhook with valid signature', async () => {
    orderId = await createTestOrder(4);
    const paymentId = '999888777';

    // Mock initial pending state
    const orderRepo = TestDataSource.getRepository(Order);
    const order = await orderRepo.findOneOrFail({ where: { id: orderId } });
    order.paymentId = paymentId;
    await orderRepo.save(order);

    // Setup Webhook Signature
    const ts = Date.now().toString();
    const xRequestId = 'req-123';
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'test_secret';
    const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    const xSignature = `ts=${ts},v1=${hmac}`;

    // Update Mock to return approved for this ID
    const { Payment } = require('../mocks/mercadopago.mock');
    Payment.lastCreatedPayment = {
      id: paymentId,
      status: 'approved',
      metadata: { order_id: orderId }
    };

    const response = await request(app)
      .post('/api/payments/webhook')
      .set('x-signature', xSignature)
      .set('x-request-id', xRequestId)
      .query({ id: paymentId, type: 'payment' });

    expect(response.status).toBe(200);

    const updatedOrder = await orderRepo.findOneBy({ id: orderId });
    expect(updatedOrder?.status).toBe(OrderStatus.PAID);
  });

  it('🛡️ should respect idempotency using X-Idempotency-Key', async () => {
    orderId = await createTestOrder(5);
    const idempotencyKey = orderId;

    // First request
    const res1 = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        paymentMethodId: 'visa',
        payer: { email: 'payer@test.com', identification: { type: 'CPF', number: '12345678909' } }
      });
    
    const paymentId1 = res1.body.id;

    // Second request (same orderId/key)
    const res2 = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        paymentMethodId: 'visa',
        payer: { email: 'payer@test.com', identification: { type: 'CPF', number: '12345678909' } }
      });

    expect(res2.status).toBe(201);
    expect(res2.body.id).toBe(paymentId1); 
  });
});
