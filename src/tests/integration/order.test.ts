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

describe('Order Integration', () => {
  let connection: DataSource;
  let token: string;
  let productId: string;
  let sizeId: number;

  beforeAll(async () => {
    connection = TestDataSource;

    // Create a user and get token
    // We can use the seeded 'john@example.com' user
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'john@example.com',
      password: 'password123',
    });
    token = loginRes.body.token;

    // Fetch seeded data
    // Find by name since slug is not a column in Product entity
    const productByNam = await connection.getRepository(Product).findOne({
      where: { name: 'Nike Air Force 1' },
    });

    if (!productByNam) throw new Error('Seeded product not found');

    productId = productByNam.id;

    // Find a size that this product has
    // The seed adds '38', '39', '40', '41', '42' to Nike Air Force 1
    const size = await connection.getRepository(Size).findOneBy({ name: '38' });
    if (!size) throw new Error('Seeded size not found');
    sizeId = size.id;
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
      acceptedTerms: true,
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);

    if (response.status !== 201) {
       console.log('Order Creation Failed:', JSON.stringify(response.body, null, 2));
    }

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.total_amount).toBeDefined(); // Should be calculated
    expect(response.body.status).toBe('PENDING');
    // Verify that the size NAME is stored, not the ID
    expect(response.body.items[0].size).toBe('38');
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
      acceptedTerms: true,
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);

    expect(response.status).toBe(404); // Or 400 depending on implementation
  });

  it('should update user accepted_terms status on order creation', async () => {
    // 1. Check current status of a user (jane@example.com is seeded with accepted_terms=false by default)
    const user = await connection
      .getRepository(Product)
      .query('SELECT * FROM users WHERE email = $1', ['jane@example.com']);
    // Note: query returns array. If migration ran, accepted_terms is false.

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'password123',
    });
    const janeToken = loginRes.body.token;

    const orderData = {
      items: [{ productId: productId, quantity: 1, size: sizeId }],
      shippingAddress: {
        street: 'Jane St',
        city: 'City',
        state: 'ST',
        zipCode: '12345-678',
        country: 'Country',
      },
      acceptedTerms: true,
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${janeToken}`)
      .send(orderData);

    expect(response.status).toBe(201);

    // 2. Verify status in DB
    const updatedUser = await connection
      .getRepository(Product)
      .query('SELECT * FROM users WHERE email = $1', ['jane@example.com']);
    expect(updatedUser[0].accepted_terms).toBe(true);
  });
});
