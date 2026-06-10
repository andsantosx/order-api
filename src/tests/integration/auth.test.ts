import { TestDataSource } from '../test-data-source';
// Mock Data Source - MUST be before app import is used
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

import request from 'supertest';
import app from '../../app';

describe('Auth Integration', () => {
  beforeAll(async () => {
    // Seed email verification first to allow register endpoint to pass
    await TestDataSource.getRepository('EmailVerification').save({
      email: 'test@example.com',
      code: '123456',
      expiresAt: new Date(Date.now() + 3600000),
      isVerified: true,
    });
  });

  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!', // Assuming validation requires this
    document: '12345678909', // Valid mock format CPF used in tests
    phone: '11999999999',
    acceptedTerms: true,
  };

  it('should register a new user', async () => {
    const response = await request(app).post('/api/auth/register').send(testUser);

    if (response.status !== 201) console.error('Register Error:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should login with valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    if (response.status !== 200) console.error('Login Error:', response.body);
    expect(response.status).toBe(200);
    
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
    const tokenCookie = (cookies as any).find((c: string) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();

    expect(response.body).toHaveProperty('user');
  });

  it('should not login with invalid password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'wrongpassword',
    });

    expect(response.status).toBe(401);
  });
});
