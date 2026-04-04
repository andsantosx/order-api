import { TestDataSource } from '../test-data-source';
// Mock Data Source - MUST be before app import is used
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

import request from 'supertest';
import app from '../../app';
import { DataSource } from 'typeorm';

describe('Contact Integration', () => {
  let connection: DataSource;

  beforeAll(async () => {
    connection = TestDataSource;
  });

  // Relies on global setup.ts for teardown

  it('should create contact message with valid phone', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Test Wrapper',
      email: 'test@example.com',
      phone: '(11) 99999-9999',
      subject: 'Test Subject',
      message: 'Test message content with at least 10 chars',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.phone).toBe('(11) 99999-9999');
  });

  it('should create contact message without phone', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Test Wrapper',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'Test message content with at least 10 chars',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should return 400 for invalid phone number', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Test Wrapper',
      email: 'test@example.com',
      phone: 'invalid-phone',
      subject: 'Test Subject',
      message: 'Test message content with at least 10 chars',
    });

    expect(response.status).toBe(400);
    // Ideally check for specific error message about phone validation
  });
});
