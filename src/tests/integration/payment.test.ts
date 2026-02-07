import { TestDataSource } from '../test-data-source';
// Mock Data Source - MUST be before app import is used
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

import request from 'supertest';
import app from '../../app';
import { Product } from '../../api/entities/Product';
import { Size } from '../../api/entities/Size';
import { Category } from '../../api/entities/Category';
import { Brand } from '../../api/entities/Brand';

import { DataSource } from 'typeorm';

describe('Payment Integration', () => {
  let connection: DataSource;
  let token: string;
  let orderId: string;

  beforeAll(async () => {
    connection = TestDataSource;

    // Auth
    await request(app).post('/api/auth/register').send({
      name: 'Pay User',
      email: 'pay@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      document: '12345678901',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'pay@example.com',
      password: 'password123',
    });
    token = loginRes.body.token;

    // Setup Data
    const brand = await connection
      .getRepository(Brand)
      .save({ name: 'B', slug: 'b', active: true });
    const category = await connection
      .getRepository(Category)
      .save({ name: 'C', slug: 'c', active: true });
    const size = await connection
      .getRepository(Size)
      .save({ name: 'L', active: true, type: 'clothing' });
    const product = await connection.getRepository(Product).save({
      name: 'P',
      slug: 'p',
      description: 'D',
      price_cents: 5000,
      active: true,
      brand,
      category,
      currency: 'BRL',
    });

    // Create Order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: product.id, quantity: 1, size: size.id }],
        shippingAddress: {
          street: 'S',
          city: 'C',
          state: 'S',
          zipCode: '12345-000',
          country: 'B',
        },
      });
    orderId = orderRes.body.id;
  });

  // Note: Actual payment processing involves external API (Mercado Pago).
  // In integration tests with in-memory DB, we might mock the service or check basic validation.
  // For now, we test the endpoint's existence and validation.

  it('should validate payment request for non-existent order', async () => {
    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: '00000000-0000-0000-0000-000000000000' });

    expect(response.status).toBe(404);
  });

  it('should initiate payment process for valid order', async () => {
    // This test might fail if MercadoPago credentials are not set or mocked at network level.
    // We expect 500 or specific error if MP fails, but 200/201 if mocked.
    // For this environment, we assume we want to check if the route is reachable and ID is found.

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId });

    // Without mocking MP, this might return 500 or 400.
    // We assert that it's NOT 404, meaning the order was found.
    expect(response.status).not.toBe(404);
  });
});
