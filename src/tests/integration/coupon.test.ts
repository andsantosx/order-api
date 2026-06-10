import { TestDataSource } from '../test-data-source';

// Mock Data Source - MUST be before app import is used
jest.mock('../../data-source', () => ({
  AppDataSource: TestDataSource,
}));

import request from 'supertest';
import app from '../../app';
import { v4 as uuidv4 } from 'uuid';

describe('Coupon Integration', () => {
  let adminToken: string;
  let userToken: string;
  let anotherUserToken: string;
  let couponId: string;
  let productId: string;
  let sizeId: number;
  const couponCode = 'PROMO20';

  beforeAll(async () => {
    // Buscar produto e tamanho semeados
    const connection = TestDataSource;
    const product = await connection.getRepository('Product').findOne({
      where: { name: 'Adidas Superstar' },
    });
    if (!product) throw new Error('Seeded product not found');
    productId = product.id;

    const size = await connection.getRepository('Size').findOneBy({ name: '39' });
    if (!size) throw new Error('Seeded size not found');
    sizeId = size.id;

    // Login como admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@admin.com',
      password: 'admin123',
    });
    const adminCookie = adminLogin.headers['set-cookie'];
    if (Array.isArray(adminCookie)) {
      const tokenCookie = adminCookie.find((c: string) => c.startsWith('token='));
      if (tokenCookie) adminToken = tokenCookie.split(';')[0].split('=')[1];
    }

    // Login como usuário comum (John Doe - possui pedido criado na inicialização dos testes de order)
    const userLogin = await request(app).post('/api/auth/login').send({
      email: 'john@example.com',
      password: 'password123',
    });
    const userCookie = userLogin.headers['set-cookie'];
    if (Array.isArray(userCookie)) {
      const tokenCookie = userCookie.find((c: string) => c.startsWith('token='));
      if (tokenCookie) userToken = tokenCookie.split(';')[0].split('=')[1];
    }

    // Login como outro usuário (Jane - sem pedidos inicialmente se rodado em isolamento)
    const anotherLogin = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'password123',
    });
    const anotherCookie = anotherLogin.headers['set-cookie'];
    if (Array.isArray(anotherCookie)) {
      const tokenCookie = anotherCookie.find((c: string) => c.startsWith('token='));
      if (tokenCookie) anotherUserToken = tokenCookie.split(';')[0].split('=')[1];
    }
  });

  // ── CRUD Admin ───────────────────────────────────────────────────────────────

  it('should allow admin to create a coupon with maxUsesPerUser=2 and minItems=3', async () => {
    const response = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: couponCode, discountPercentage: 20, maxUsesPerUser: 2, minItems: 3 });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.code).toBe(couponCode);
    expect(response.body.discountPercentage).toBe(20);
    expect(response.body.maxUsesPerUser).toBe(2);
    expect(response.body.minItems).toBe(3);
    expect(response.body.usedCount).toBe(0);

    couponId = response.body.id;
  });

  it('should prevent admin from creating a coupon with duplicate code', async () => {
    const response = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: couponCode, discountPercentage: 10, maxUsesPerUser: 10 });

    expect(response.status).toBe(400);
  });

  it('should allow admin to create a coupon with lowercase letters and save it as uppercase', async () => {
    const lowercaseCode = 'lowercase123';
    const response = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: lowercaseCode, discountPercentage: 15, maxUsesPerUser: 5, minItems: 2 });

    expect(response.status).toBe(201);
    expect(response.body.code).toBe('LOWERCASE123'); // Deve converter para UPPERCASE

    // Deletar para limpar
    await request(app)
      .delete(`/api/coupons/${response.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('should allow admin to list all coupons', async () => {
    const response = await request(app)
      .get('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('code');
  });

  it('should allow admin to edit maxUsesPerUser, discountPercentage, and minItems', async () => {
    const response = await request(app)
      .patch(`/api/coupons/${couponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maxUsesPerUser: 3, discountPercentage: 25, minItems: 4 });

    expect(response.status).toBe(200);
    expect(response.body.maxUsesPerUser).toBe(3);
    expect(response.body.discountPercentage).toBe(25);
    expect(response.body.minItems).toBe(4);

    // Restaurar valores para o restante dos testes
    await request(app)
      .patch(`/api/coupons/${couponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maxUsesPerUser: 2, discountPercentage: 20, minItems: 3 });
  });

  it('should fail edit if maxUsesPerUser < 1 (invalid)', async () => {
    const response = await request(app)
      .patch(`/api/coupons/${couponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maxUsesPerUser: -1 });

    expect(response.status).toBe(400);
  });

  // ── Validação Pública ─────────────────────────────────────────────────────────

  it('should allow public (guest) to validate a coupon with itemCount >= minItems (3)', async () => {
    const response = await request(app)
      .get('/api/coupons/validate')
      .query({ code: couponCode, itemCount: 3 });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(couponCode);
    expect(response.body.discountPercentage).toBe(20);
    expect(response.body.minItems).toBe(3);
    expect(response.body.usesLeft).toBeNull(); // guest não tem controle individual
  });

  it('should fail public validation if itemCount < minItems (2 < 3)', async () => {
    const response = await request(app)
      .get('/api/coupons/validate')
      .query({ code: couponCode, itemCount: 2 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Este cupom só é válido para compras com 3 ou mais itens');
  });

  it('should fail validation if coupon code does not exist', async () => {
    const response = await request(app)
      .get('/api/coupons/validate')
      .query({ code: 'INVALIDCODE', itemCount: 2 });

    expect(response.status).toBe(404);
  });

  // ── Validação por Usuário ────────────────────────────────────────────────────

  it('should allow logged-in user to validate (usesLeft = maxUsesPerUser initially)', async () => {
    const response = await request(app)
      .get('/api/coupons/validate')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ code: couponCode, itemCount: 3 });

    expect(response.status).toBe(200);
    expect(response.body.usesLeft).toBe(2); // maxUsesPerUser=2, ainda não usou
  });

  it('should allow a second user to validate independently', async () => {
    const response = await request(app)
      .get('/api/coupons/validate')
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .query({ code: couponCode, itemCount: 3 });

    expect(response.status).toBe(200);
    expect(response.body.usesLeft).toBe(2); // também não usou ainda
  });

  // ── Expiração e Inatividade ───────────────────────────────────────────────────

  it('should allow admin to create an inactive coupon and fail public validation', async () => {
    const inactiveCode = 'INACTIVE50';
    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: inactiveCode, discountPercentage: 50, maxUsesPerUser: 5, minItems: 2, isActive: false });

    expect(createRes.status).toBe(201);
    expect(createRes.body.isActive).toBe(false);

    const tempInactiveId = createRes.body.id;

    const validateRes = await request(app)
      .get('/api/coupons/validate')
      .query({ code: inactiveCode, itemCount: 2 });

    expect(validateRes.status).toBe(400);
    expect(validateRes.body.message).toBe('Este cupom está temporariamente inativo');

    const updateRes = await request(app)
      .patch(`/api/coupons/${tempInactiveId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.isActive).toBe(true);

    const validateRes2 = await request(app)
      .get('/api/coupons/validate')
      .query({ code: inactiveCode, itemCount: 2 });

    expect(validateRes2.status).toBe(200);

    await request(app)
      .delete(`/api/coupons/${tempInactiveId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('should allow admin to create an expired coupon and fail public validation', async () => {
    const expiredCode = 'EXPIRED10';
    const pastDate = new Date(Date.now() - 3600000).toISOString();

    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: expiredCode,
        discountPercentage: 10,
        maxUsesPerUser: 5,
        minItems: 2,
        expiresAt: pastDate,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.expiresAt).toBeDefined();

    const tempExpiredId = createRes.body.id;

    const validateRes = await request(app)
      .get('/api/coupons/validate')
      .query({ code: expiredCode, itemCount: 2 });

    expect(validateRes.status).toBe(400);
    expect(validateRes.body.message).toBe('Este cupom já expirou e não é mais válido');

    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const updateRes = await request(app)
      .patch(`/api/coupons/${tempExpiredId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ expiresAt: futureDate });

    expect(updateRes.status).toBe(200);

    const validateRes2 = await request(app)
      .get('/api/coupons/validate')
      .query({ code: expiredCode, itemCount: 2 });

    expect(validateRes2.status).toBe(200);

    await request(app)
      .delete(`/api/coupons/${tempExpiredId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  // ── Segunda Evolução: Novas Validações e Limites ───────────────────────────────

  it('should allow admin to configure a coupon with minItems=1 and successfully validate it', async () => {
    const minItemCode = 'ONEITEM10';
    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: minItemCode, discountPercentage: 10, maxUsesPerUser: 2, minItems: 1 });

    expect(createRes.status).toBe(201);
    expect(createRes.body.minItems).toBe(1);

    // Deve validar com apenas 1 item
    const validateRes = await request(app)
      .get('/api/coupons/validate')
      .query({ code: minItemCode, itemCount: 1 });

    expect(validateRes.status).toBe(200);

    await request(app)
      .delete(`/api/coupons/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('should validate minOrderValueCents (subtotal mínimo do carrinho)', async () => {
    const minValCode = 'MINVAL30';
    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: minValCode, discountPercentage: 10, maxUsesPerUser: 2, minItems: 1, minOrderValueCents: 15000 }); // R$ 150,00

    expect(createRes.status).toBe(201);

    // Validar com valor abaixo do mínimo (R$ 100,00 = 10000 centavos)
    const validateRes1 = await request(app)
      .get('/api/coupons/validate')
      .query({ code: minValCode, itemCount: 1, subtotalCents: 10000 });

    expect(validateRes1.status).toBe(400);
    expect(validateRes1.body.message).toContain('Este cupom só é válido para compras acima de R$ 150,00');

    // Validar com valor igual ou acima do mínimo (R$ 200,00 = 20000 centavos)
    const validateRes2 = await request(app)
      .get('/api/coupons/validate')
      .query({ code: minValCode, itemCount: 1, subtotalCents: 20000 });

    expect(validateRes2.status).toBe(200);

    await request(app)
      .delete(`/api/coupons/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('should apply maxDiscountCents (teto máximo de desconto) in checkout', async () => {
    const maxDiscountCode = 'TETO50';
    // Cupom de 50% limitado a R$ 30,00 (3000 centavos)
    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: maxDiscountCode, discountPercentage: 50, maxUsesPerUser: 2, minItems: 1, maxDiscountCents: 3000 });

    expect(createRes.status).toBe(201);

    // Fazer checkout de produto com preço alto
    const orderData = {
      items: [{ productId: productId, quantity: 1, size: sizeId }],
      shippingAddress: {
        street: 'Test St',
        number: '123',
        city: 'City',
        state: 'ST',
        zipCode: '12345-678',
        country: 'Country',
      },
      phone: '11999998888',
      acceptedTerms: true,
      couponCode: maxDiscountCode,
      idempotencyKey: uuidv4(),
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(orderData);

    expect(response.status).toBe(201);
    expect(response.body.order.discountAmount).toBe(3000); // Exatamente R$ 30,00 de teto de desconto

    await request(app)
      .delete(`/api/coupons/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('should block validation and checkout when coupon is for firstOrderOnly and user is not new', async () => {
    const firstOrderCode = 'WELCOME10';
    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: firstOrderCode, discountPercentage: 10, maxUsesPerUser: 1, minItems: 1, firstOrderOnly: true });

    expect(createRes.status).toBe(201);

    // userToken é de John Doe que possui pedido no banco (não é novo)
    const validateRes = await request(app)
      .get('/api/coupons/validate')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ code: firstOrderCode, itemCount: 1 });

    expect(validateRes.status).toBe(400);
    expect(validateRes.body.message).toBe('Este cupom é exclusivo para a primeira compra');

    // Tentar checkout e ver que falha também (mudando a quantidade para 2 para diferenciar o totalAmount)
    const orderData = {
      items: [{ productId: productId, quantity: 2, size: sizeId }],
      shippingAddress: {
        street: 'Test St',
        number: '123',
        city: 'City',
        state: 'ST',
        zipCode: '12345-678',
        country: 'Country',
      },
      phone: '11999998888',
      acceptedTerms: true,
      couponCode: firstOrderCode,
      idempotencyKey: uuidv4(),
    };

    const checkoutRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(orderData);

    expect(checkoutRes.status).toBe(400);
    expect(checkoutRes.body.message).toBe('Este cupom é exclusivo para a primeira compra');

    await request(app)
      .delete(`/api/coupons/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('should enforce maxUsesGlobal limit across multiple users', async () => {
    const globalLimitCode = 'LIMITGLOBAL';
    // Limite global de apenas 1 uso
    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: globalLimitCode, discountPercentage: 10, maxUsesPerUser: 1, minItems: 1, maxUsesGlobal: 1 });

    expect(createRes.status).toBe(201);

    // Primeiro usuário faz checkout com sucesso usando o cupom (quantidade 3 para diferenciar o totalAmount)
    const orderData = {
      items: [{ productId: productId, quantity: 3, size: sizeId }],
      shippingAddress: {
        street: 'Test St',
        number: '123',
        city: 'City',
        state: 'ST',
        zipCode: '12345-678',
        country: 'Country',
      },
      phone: '11999998888',
      acceptedTerms: true,
      couponCode: globalLimitCode,
      idempotencyKey: uuidv4(),
    };

    const checkoutRes1 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(orderData);

    expect(checkoutRes1.status).toBe(201);

    // Segundo usuário (anotherUserToken) tenta validar o mesmo cupom e falha pois atingiu o limite global
    const validateRes = await request(app)
      .get('/api/coupons/validate')
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .query({ code: globalLimitCode, itemCount: 1 });

    expect(validateRes.status).toBe(400);
    expect(validateRes.body.message).toBe('Este cupom atingiu o limite máximo de usos permitido');

    // Segundo usuário tenta fazer checkout e falha (quantidade 4 e outra chave de idempotência)
    const orderData2 = {
      items: [{ productId: productId, quantity: 4, size: sizeId }],
      shippingAddress: {
        street: 'Test St',
        number: '123',
        city: 'City',
        state: 'ST',
        zipCode: '12345-678',
        country: 'Country',
      },
      phone: '11999998888',
      acceptedTerms: true,
      couponCode: globalLimitCode,
      idempotencyKey: uuidv4(),
    };

    const checkoutRes2 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .send(orderData2);

    expect(checkoutRes2.status).toBe(400);
    expect(checkoutRes2.body.message).toBe('Este cupom atingiu o limite máximo de usos permitido');

    await request(app)
      .delete(`/api/coupons/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  // ── Deleção ───────────────────────────────────────────────────────────────────

  it('should allow admin to delete a coupon', async () => {
    const response = await request(app)
      .delete(`/api/coupons/${couponId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Cupom removido com sucesso');
  });

  it('should fail validation after deletion', async () => {
    const response = await request(app)
      .get('/api/coupons/validate')
      .query({ code: couponCode, itemCount: 2 });

    expect(response.status).toBe(404);
  });
});
