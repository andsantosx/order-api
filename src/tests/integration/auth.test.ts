import { TestDataSource } from '../test-data-source';
// Mock Data Source - MUST be before app import is used
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

import request from 'supertest';
import app from '../../app';

describe('Auth Integration', () => {
  beforeAll(async () => {
    // Connection is already established in setup.ts
  });

  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!', // Assuming validation requires this
    document: '12345678901', // Example valid document
    acceptedTerms: true,
  };

  it('should register a new user', async () => {
    const response = await request(app).post('/api/auth/register').send(testUser);

    if (response.status !== 201) console.error('Register Error:', response.body);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(testUser.email);
    expect(response.body).not.toHaveProperty('password');
  });

  it('should login with valid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    if (response.status !== 200) console.error('Login Error:', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
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
