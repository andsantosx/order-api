# Order API - Marketplace de Roupas

Uma API REST completa para marketplace de roupas, com sistema de pedidos, pagamentos via Stripe e autenticação JWT.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 22.x
- PostgreSQL (ou Docker)
- Conta Stripe (para pagamentos)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/andsantosx/order-api.git
cd order-api
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.exemple .env
```

Edite o `.env` com suas credenciais:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/order_db
JWT_SECRET=seu_secret_super_seguro
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3000
NODE_ENV=development
```

### Rodando Localmente

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

### Build para Produção

```bash
npm run build
npm start
```

---

## 🏛️ Arquitetura

Este projeto segue a arquitetura **MVC + Services** para garantir código limpo e escalável:

```
src/
├── api/
│   ├── controllers/      # Recebem requisições HTTP
│   ├── services/         # Lógica de negócio e transações
│   ├── entities/         # Modelos do banco (TypeORM)
│   ├── routes/           # Definição de endpoints
│   ├── middlewares/      # Autenticação, validação, erros
│   └── schemas/          # Validação com Zod
├── config/               # Configurações (Stripe, etc)
├── data-source.ts        # Configuração TypeORM
└── server.ts             # Inicialização do Express
```

### Camadas

- **Controllers**: Validam entrada e chamam Services
- **Services**: Contêm toda a lógica de negócio
- **Entities**: Definem o schema do banco de dados
- **Middlewares**: Autenticação JWT, validação Zod, tratamento de erros
- **Routes**: Mapeiam URLs para Controllers

---

## 📚 Endpoints da API

### Base URL
**Produção**: `https://order-api.up.railway.app`  
**Local**: `http://localhost:3000`

### 🔓 Públicos

#### Produtos
- `GET /api/products` - Listar todos os produtos
- `GET /api/products/:id` - Detalhes de um produto

#### Pedidos (Guest Checkout)
- `POST /api/orders` - Criar pedido sem login
  ```json
  {
    "guestEmail": "cliente@example.com",
    "items": [
      { "productId": "uuid", "quantity": 2 }
    ]
  }
  ```

#### Pagamentos
- `POST /api/payments/create-payment-intent` - Criar intenção de pagamento
  ```json
  {
    "orderId": "uuid-do-pedido"
  }
  ```

### � Admin (Requer Autenticação)

#### Autenticação
- `POST /api/auth/register` - Criar conta admin
  ```json
  {
    "email": "admin@store.com",
    "password": "senha123"
  }
  ```

- `POST /api/auth/login` - Login (retorna token JWT válido por 24h)
  ```json
  {
    "email": "admin@store.com",
    "password": "senha123"
  }
  ```

#### Produtos (Admin)
- `POST /api/products` - Criar produto
  ```json
  {
    "name": "Camiseta Básica",
    "description": "100% algodão",
    "price_cents": 4990,
    "stock": 50
  }
  ```
  **Header**: `Authorization: Bearer <seu-token>`

#### Pedidos (Admin)
- `GET /api/orders` - Listar todos os pedidos
- `GET /api/orders/:id` - Detalhes de um pedido

**Header**: `Authorization: Bearer <seu-token>`

### 🔔 Webhooks
- `POST /api/payments/webhook` - Webhook Stripe (atualiza status do pedido)

---

## 🛡️ Segurança

- ✅ **Senhas**: Hash com bcrypt (salt rounds: 10)
- ✅ **JWT**: Tokens expiram em 24 horas
- ✅ **Validação**: Zod valida todos os inputs
- ✅ **CORS**: Configurado para aceitar requisições
- ✅ **Transações**: Rollback automático em caso de erro
- ✅ **Error Handling**: Middleware global captura todos os erros

---

## 🛠️ Tecnologias

- **Runtime**: Node.js 22.x
- **Framework**: Express 5.x
- **Linguagem**: TypeScript 5.x
- **ORM**: TypeORM 0.3.x
- **Banco de Dados**: PostgreSQL
- **Validação**: Zod
- **Autenticação**: JWT (jsonwebtoken)
- **Pagamentos**: Stripe
- **Deploy**: Railway

---

## 📦 Scripts Disponíveis

```bash
npm run dev      # Desenvolvimento com hot-reload
npm run build    # Compilar TypeScript
npm start        # Rodar versão compilada
```

---

## 🌐 Deploy

Este projeto está configurado para deploy automático no Railway.

1. Conecte seu repositório GitHub ao Railway
2. Configure as variáveis de ambiente no Railway
3. O Railway executará automaticamente:
   ```bash
   npm run build && npm start
   ```

---

## 📝 Licença

MIT

---

## 👨‍💻 Autor

Anderson Santos - [GitHub](https://github.com/andsantosx)
