# 📖 Referência da API (API Reference)

> [!CAUTION]
> **SEGURANÇA (Zero Trust)**: Todos os exemplos neste guia referenciam chaves base (*placeholders*). Jamais utilize dados de produção (DB, JWT_SECRET, Tokens) nestes arquivos que são abertos ao público.

---

## 1. Glossário Arquitetônico
A API da **Order API Enterprise** estrutura-se estritamente sob os conceitos do RESTful e atua inteiramente através da camada HTTP para comunicações síncronas e **Socket.io** para push-notifications de tempo-real (Vide guia em [Realtime & Webhooks](REALTIME_AND_WEBHOOKS.md)).

### Formatos 
- **Content-Type Aceitos**: `application/json` (Limite de body: `10kb` mitigando DoS).
- **Datas Genéricas**: Padrão puramente `ISO 8601 UTC` (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Moeda Transacional (Crucial)**: Evitamos `floats` para impedir quebras de precisão. O banco suporta valores transacionais (`total_amount`, frete) **somente em número Inteiro - Centavos**. Exemplos: `R$ 45,99` enviado na API = `4599`.

---

## 2. Visão Geográfica das Rotas

Abaixo estão os contêineres principais de roteamento acoplados em `app.ts`.

| Módulo de Roteamento | Endpoints Iniciais (Prefix: `/api`) | Permissão e Escopo (Roles) |
| :--- | :--- | :--- |
| **Autenticação** | `/auth` | Público. Login, registro, reset de senha, verificação de email. Rate limit: 5 req/15min |
| **Produtos** | `/products`, `/images` | Listagem pública (Scraping limit protection). Mutações requerem Admin. |
| **Categorias** | `/categories` | Listagem pública. CRUD requer Admin. |
| **Marcas** | `/brands` | Listagem pública. CRUD requer Admin. |
| **Tamanhos** | `/sizes` | Listagem pública. CRUD requer Admin. |
| **Pedidos** | `/orders` | Criação permite Guest Checkout. Listagem/Atualização requer autenticação. |
| **Pagamentos** | `/payments`, `/payments/webhook` | Processamento requer autenticação. Webhooks são públicos (validados por signature). |
| **Frete** | `/shipping` | Cálculo público baseado em CEP. |
| **Perfil** | `/profile` | Requer autenticação. CRUD de endereços, dados pessoais. |
| **Wishlist** | `/wishlist` | Requer autenticação. Adicionar/Remover/Listar produtos favoritos. |
| **Contato** | `/contact` | Público. Envio de mensagens. Rate limit: 5 req/15min. |
| **Admin** | `/admin` | Requer `isAdmin: true`. Gerenciamento de pedidos, produtos, usuários. |
| **Estatísticas** | `/admin/stats` | Requer `isAdmin: true`. Dashboard com métricas de vendas. |
| **Health Check** | `/health` | Público. Status de conectores (PostgreSQL, Mercado Pago, Mailjet). |

---

## 3. Autenticação e Protocolo JWT

Implementamos uma barreira Bearer Token criptografada e controlada.

- **Transferência**: Requisições devem ir via header HTTP `Authorization: Bearer <seu_token>`.
- **Validação Cruzada**: Todo token possui a secret embarcada exigindo um arquivo original do `env.JWT_SECRET` contendo robustez de cifra de fluxo (Mínimo de 32 bytes).

### Modelo Comum de Payload Internificado
```json
{
  "userId": "uuid-v4-auto-generated",
  "email": "user@customer.com",
  "isAdmin": false,
  "iat": 1700000000,
  "exp": 1700086400 // TTL padronizado para segurança de cessão curta (Ex: 24h)
}
```

---

## 4. Estratégias HTTP de Sucesso e Padronagem de Respostas

O Core Engine valida os schemas através do **Zod**, promovendo um encadeamento seguro onde não existem ambiguidades nos controllers.

| Status | Representatividade Semântica |
|:---:|---|
| `200/201` | **Sucesso**: O payload atendeu, entidades processadas ou lidas perfeitamente. |
| `204` | **Remoção Limpa**: Deletações aceitas com segurança, sem payload retornado em body. |
| `400` | **Falha de Formato (Bad Request)**: Propriedade falhou a triagem do Zod. Veja exemplo de corpo abaixo. |
| `401 / 403` | **Acesso Interrompido**: Chave de leitura bloqueada pela Middleware `Auth` e `isAdmin`. |
| `429` | **Tráfego Denegado**: Express Rate Limiter interceptou tráfego abusivo. |

### Exemplo - Falha Capturada pelo Zod Sanitizer:
```json
{
  "status": "error",
  "message": "Erro de validação em camadas HTTP",
  "errors": [
    { "field": "shippingAddress.zipCode", "message": "O campo CEP deve contar apenas 8 dígitos." }
  ]
}
```

### Relatório de Paginação (Standard Format)
Requisições GET em listas maiores são tratadas sem estrangular dados via `limit` (max records) e `page`.
```json
{
  "data": [ ...produtos/pedidos... ],
  "next_page_url": "/api/orders?page=2",
  "total": 599,
  "page": 1,
  "limit": 20,
  "totalPages": 30
}
```

> [!TIP]
> Caso necessite gerar coleções Swagger compatíveis para Postman/Insomnia, faça a execução nativa através do `run dev` e acesse sua sub-branch local de inspeção visual pelo link exposto pelo App no terminal.

---

## 5. Endpoints Principais Documentados

### 🔐 Autenticação (`/api/auth`)

#### POST `/auth/register`
Registro de novo usuário.

**Body**:
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "document": "12345678900",
  "acceptedTerms": true
}
```

**Response (201)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "isAdmin": false
  }
}
```

#### POST `/auth/login`
Login de usuário existente.

#### POST `/auth/verify-email/:token`
Verificação de email com token recebido por email.

#### POST `/auth/request-password-reset`
Solicita reset de senha (envia email com token).

#### POST `/auth/reset-password`
Reseta senha usando token recebido por email.

---

### 🛍️ Produtos (`/api/products`)

#### GET `/products`
Lista produtos com filtros e paginação.

**Query Params**:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `categoryId` - Filtrar por categoria
- `brandId` - Filtrar por marca
- `isFeatured` - Filtrar produtos em destaque (true/false)
- `search` - Busca por nome ou descrição

**Response (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Camiseta Básica",
      "description": "Camiseta 100% algodão",
      "price_cents": 4990,
      "has_customization": true,
      "customization_cost_cents": 2500,
      "isFeatured": true,
      "category": { "id": "uuid", "name": "Camisetas" },
      "brand": { "id": "uuid", "name": "Marca X" },
      "images": ["https://..."],
      "sizes": [
        { "size": "P", "stock": 10 },
        { "size": "M", "stock": 15 }
      ]
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

#### POST `/products` 🔒 Admin
Cria novo produto.

#### PUT `/products/:id` 🔒 Admin
Atualiza produto existente.

#### DELETE `/products/:id` 🔒 Admin
Remove produto.

---

### 📦 Pedidos (`/api/orders`)

#### POST `/orders`
Cria novo pedido (permite guest checkout).

**Body**:
```json
{
  "items": [
    {
      "productId": "uuid",
      "size": "M",
      "quantity": 2,
      "customization": "Nome: João"
    }
  ],
  "shippingAddress": {
    "street": "Rua Example",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234567",
    "country": "Brasil"
  },
  "guestEmail": "guest@example.com",
  "acceptedTerms": true
}
```

**Response (201)**:
```json
{
  "id": "order-uuid",
  "user": { "id": "uuid", "email": "guest@example.com" },
  "items": [...],
  "subtotal_cents": 9980,
  "customization_cost_cents": 5000,
  "shipping_cost_cents": 0,
  "total_amount": 14980,
  "status": "PENDING",
  "created_at": "2024-04-29T10:00:00Z"
}
```

#### GET `/orders` 🔒 User
Lista pedidos do usuário autenticado.

#### GET `/orders/:id` 🔒 User/Admin
Detalhes de um pedido específico.

#### PATCH `/orders/:id/cancel` 🔒 User
Cancela um pedido pendente.

---

### 💳 Pagamentos (`/api/payments`)

#### POST `/payments/:orderId`
Processa pagamento de um pedido.

**Body**:
```json
{
  "paymentMethod": "pix",
  "payerEmail": "joao@example.com"
}
```

**Response (200)**:
```json
{
  "paymentId": "mp-payment-id",
  "status": "pending",
  "qrCode": "00020126....",
  "qrCodeBase64": "data:image/png;base64,...",
  "ticketUrl": "https://mercadopago.com/...",
  "expirationDate": "2024-04-29T23:59:59Z"
}
```

#### POST `/payments/webhook`
Webhook do Mercado Pago para atualização de status.

---

### ❤️ Wishlist (`/api/wishlist`) 🔒 User

#### GET `/wishlist`
Lista produtos na wishlist do usuário.

#### POST `/wishlist`
Adiciona produto à wishlist.

**Body**:
```json
{
  "productId": "uuid"
}
```

#### DELETE `/wishlist/:productId`
Remove produto da wishlist.

---

### 📧 Contato (`/api/contact`)

#### POST `/contact`
Envia mensagem de contato.

**Body**:
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "subject": "Dúvida sobre produto",
  "message": "Gostaria de saber mais informações..."
}
```

---

### 👤 Perfil (`/api/profile`) 🔒 User

#### GET `/profile`
Retorna dados do usuário autenticado.

#### PUT `/profile`
Atualiza dados do perfil.

#### GET `/profile/addresses`
Lista endereços salvos.

#### POST `/profile/addresses`
Adiciona novo endereço.

#### DELETE `/profile/addresses/:id`
Remove endereço.

---

### 🔧 Admin (`/api/admin`) 🔒 Admin

#### GET `/admin/orders`
Lista todos os pedidos (com filtros avançados).

#### PATCH `/admin/orders/:id/status`
Atualiza status de um pedido.

**Body**:
```json
{
  "status": "SHIPPED",
  "trackingCode": "RA123456789BR",
  "notes": "Pedido enviado via Correios"
}
```

#### POST `/admin/orders/:id/refund`
Processa reembolso de um pedido.

#### GET `/admin/users`
Lista todos os usuários.

#### GET `/admin/audit-logs`
Lista logs de auditoria de ações administrativas.

---

### 📊 Estatísticas (`/api/admin/stats`) 🔒 Admin

#### GET `/admin/stats/dashboard`
Retorna métricas do dashboard.

**Response (200)**:
```json
{
  "totalOrders": 1250,
  "totalRevenue": 125000000,
  "totalUsers": 850,
  "ordersToday": 15,
  "revenueToday": 1500000,
  "ordersByStatus": {
    "PENDING": 5,
    "PAID": 10,
    "SHIPPED": 20
  },
  "topProducts": [...]
}
```

---

### 🏥 Health Check (`/api/health`)

#### GET `/health`
Verifica status de todos os serviços.

**Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2024-04-29T10:00:00Z",
  "services": {
    "database": "healthy",
    "mercadopago": "healthy",
    "mailjet": "healthy"
  },
  "uptime": 86400
}
```

---

## 6. Recursos Especiais

### Customização de Produtos

Produtos podem ser customizados com custo adicional de **R$ 25,00** por item:

```json
{
  "productId": "uuid",
  "size": "M",
  "quantity": 1,
  "customization": "Nome: João Silva - Número: 10"
}
```

O custo de customização é calculado separadamente e exibido no breakdown do pedido.

### Auto-signup para Guests

Usuários não autenticados podem fazer pedidos fornecendo apenas email:
- Sistema cria automaticamente uma conta
- Senha aleatória é gerada e enviada por email
- Usuário pode fazer login posteriormente para acompanhar pedidos

### Frete Grátis

Atualmente o frete é **GRÁTIS** para todos os pedidos:
- `FIXED_SHIPPING_COST_CENTS: 0`
- `FREE_SHIPPING_THRESHOLD_CENTS: 0`

### Notificações em Tempo Real

Integração com Socket.io para atualização instantânea de:
- Status de pagamento
- Status de pedido
- Notificações administrativas

Conecte-se em `wss://api.example.com` com token JWT no header `Authorization`.
