import { TestDataSource } from '../test-data-source';

// Mock Data Source - MUST be before app import is used
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

import request from 'supertest';
import app from '../../app';
import { DataSource } from 'typeorm';
import { Product } from '../../api/entities/Product';
import { Size } from '../../api/entities/Size';
import { Category } from '../../api/entities/Category';
import { Brand } from '../../api/entities/Brand';

describe('Order Integration', () => {
  let connection: DataSource;
  let token: string;
  let productId: string;
  let sizeId: number;

  beforeAll(async () => {
    connection = TestDataSource;

    // Create a user and get token
    await request(app).post('/api/auth/register').send({
      name: 'Order User',
      email: 'order@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      document: '12345678901',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'order@example.com',
      password: 'password123',
    });
    token = loginRes.body.token;

    // Seed necessary data (Brand, Category, Size, Product)
    const brand = await connection
      .getRepository(Brand)
      .save({ name: 'Brand X', slug: 'brand-x', active: true });
    const category = await connection
      .getRepository(Category)
      .save({ name: 'Cat X', slug: 'cat-x', active: true });
    const size = await connection
      .getRepository(Size)
      .save({ name: 'M', active: true, type: 'clothing' });
    sizeId = size.id; // Correctly get ID as number but use it properly

    const product = await connection.getRepository(Product).save({
      name: 'Test Product',
      slug: 'test-product',
      description: 'Desc',
      price_cents: 1000,
      active: true,
      brand,
      category,
      currency: 'BRL',
    });
    productId = product.id;
  });

  it('should create a new order', async () => {
    const orderData = {
      items: [
        {
          productId: productId,
          quantity: 2,
          size: sizeId,
        },
      ],
      shippingAddress: {
        street: 'Test St',
        city: 'City',
        state: 'ST',
        zipCode: '12345-678',
        country: 'Country',
      },
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);

    if (response.status !== 201) {
      // console.log('Order Creation Failed:', response.body);
    }

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.total_amount).toBeDefined(); // Should be calculated
    expect(response.body.status).toBe('PENDING');
    // Verify that the size NAME is stored, not the ID
    expect(response.body.items[0].size).toBe('M');
  });

  it('should fail to create order with invalid product', async () => {
    const orderData = {
      items: [
        {
          productId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Fresh UUID
          quantity: 1,
          size: sizeId,
        },
      ],
      shippingAddress: {
        street: 'Test St',
        city: 'City',
        state: 'ST',
        zipCode: '12345-678',
        country: 'Country',
      },
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);

    expect(response.status).toBe(404); // Or 400 depending on implementation
  });
});
