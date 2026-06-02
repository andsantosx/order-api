import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { TestDataSource } from '../test-data-source';

// Mock Data Source
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

// Mock Mercado Pago
import * as mpMock from '../mocks/mercadopago.mock';
jest.mock('mercadopago', () => mpMock);

import request from 'supertest';
import app from '../../app';
import { Order, OrderStatus } from '../../api/entities/Order';
import { User } from '../../api/entities/User';
import { Product } from '../../api/entities/Product';
import { ProductSize } from '../../api/entities/ProductSize';
import { log } from '../../config/logger';
import { seedStatuses } from '../utils/seedStatuses';

jest.setTimeout(60000);

describe('Payment Flow Integration (Mercado Pago)', () => {
  let token: string;
  let orderId: string;

  beforeAll(async () => {
    try {
      if (!TestDataSource.isInitialized) {
        await TestDataSource.initialize();
      }

      await seedStatuses(TestDataSource);

      const userRepo = TestDataSource.getRepository(User);
      const email = 'payment_flow_tester@example.com';
      await userRepo.delete({ email });

      const user = await userRepo.save(
        userRepo.create({
          name: 'Flow Tester',
          email,
          passwordHash: 'hash',
          document: '12345678909',
          phone: '11999991111',
          acceptedTerms: true,
        }),
      );
      // userId was unused and removed

      // Seed a product for the test
      const productRepo = TestDataSource.getRepository(Product);
      const product = await productRepo.save(
        productRepo.create({
          name: 'Test Product',
          priceCents: 10000,
          currency: 'BRL',
          description: 'Test description',
        }),
      );

      // Seed a size and link it to the product
      const sizeRepo = TestDataSource.getRepository('Size');
      let sizeM = await sizeRepo.findOneBy({ name: 'M' });
      if (!sizeM) {
        sizeM = await sizeRepo.save(sizeRepo.create({ name: 'M', type: 'clothing' }));
      }

      const productSizeRepo = TestDataSource.getRepository(ProductSize);
      await productSizeRepo.save(
        productSizeRepo.create({
          product: product,
          size: sizeM,
        }),
      );

      token = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, {
        expiresIn: '1h',
      });

      log.info('✅ Payment flow test environment initialized');
    } catch (error) {
      console.error('beforeAll error:', error);
      throw error;
    }
  });

  it('🛒 should create an order as a prerequisite', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            productId: (await TestDataSource.getRepository('Product').findOneBy({}))?.id,
            quantity: 1,
            size: 'M',
          },
        ],
        shippingAddress: {
          zipCode: '01001-000',
          street: 'Rua de Teste Longa',
          city: 'São Paulo',
          state: 'SP',
          country: 'BR',
        },
        phone: '11999990000',
        acceptedTerms: true,
      });

    expect(res.status).toBe(201);
    orderId = res.body.id;
  });

  it('💳 should process a payment successfully', async () => {
    const res = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        paymentMethodId: 'visa',
        payer: { email: 'test@example.com', identification: { type: 'CPF', number: '123' } },
        token: 'card_token',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('approved');

    // Verify order status update
    const orderRepo = TestDataSource.getRepository(Order);
    const updatedOrder = await orderRepo.findOneBy({ id: orderId });
    expect(updatedOrder?.statusId).toBe(OrderStatus.PAID);
  });

  it('🛡️ should respect idempotency using X-Idempotency-Key', async () => {
    const idempotencyKey = `idemp_${Date.now()}`;

    // First request
    const res1 = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({
        orderId,
        paymentMethodId: 'visa',
        payer: { email: 'test@example.com', identification: { type: 'CPF', number: '123' } },
        token: 'card_token',
      });

    expect([200, 201]).toContain(res1.status);

    // Second request (same key)
    const res2 = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({
        orderId,
        paymentMethodId: 'visa',
        payer: { email: 'test@example.com', identification: { type: 'CPF', number: '123' } },
        token: 'card_token',
      });

    expect(res2.status).toBe(res1.status);
    expect(res2.body.id).toBe(res1.body.id);
  });
});
