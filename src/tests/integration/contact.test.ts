import { TestDataSource } from '../test-data-source';

// Mock Data Source - MUST be before app import is used
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

import request from 'supertest';
import app from '../../app';
import { ContactMessageStatus } from '../../api/entities/ContactMessage';

describe('Contact Integration', () => {
  let adminToken: string;
  let messageId: string;

  beforeAll(async () => {
    // Login as admin
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@admin.com',
      password: 'admin123',
    });
    adminToken = loginRes.body.token;
  });

  it('should create a new contact message publicly', async () => {
    const contactData = {
      name: 'Tester User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a test message',
    };

    const response = await request(app).post('/api/contacts').send(contactData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.statusId).toBe(ContactMessageStatus.PENDING);
    expect(response.body.status.name).toBe('PENDING');
    expect(response.body.status.label).toBe('Novo');

    messageId = response.body.id;
  });

  it('should allow admin to list all contact messages', async () => {
    const response = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('status');
  });

  it('should allow admin to respond to a message', async () => {
    const response = await request(app)
      .post(`/api/contacts/${messageId}/respond`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ response: 'This is an admin response' });

    expect(response.status).toBe(200);
    expect(response.body.statusId).toBe(ContactMessageStatus.REPLIED);
    expect(response.body.response).toBe('This is an admin response');
    expect(response.body.status.name).toBe('REPLIED');
  });

  it('should allow admin to manually update status', async () => {
    const response = await request(app)
      .patch(`/api/contacts/${messageId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: ContactMessageStatus.CLOSED });

    expect(response.status).toBe(200);
    expect(response.body.statusId).toBe(ContactMessageStatus.CLOSED);
    expect(response.body.status.name).toBe('CLOSED');
  });

  it('should fail if unauthenticated user tries to access admin routes', async () => {
    const response = await request(app).get('/api/contacts');
    expect(response.status).toBe(401);
  });
});
