# 🛒 Order API - E-commerce Completo

API REST completa para e-commerce de roupas com sistema de pedidos, pagamentos via Mercado Pago, autenticação JWT e gestão de catálogo.

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791.svg)](https://www.postgresql.org/)

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Início Rápido](#-início-rápido)
- [Arquitetura](#️-arquitetura)
- [Documentação da API](#-documentação-da-api)
- [Tecnologias](#️-tecnologias)
- [Segurança](#️-segurança)
- [Deploy](#-deploy)

---

## ✨ Funcionalidades

### 🛍️ Catálogo

- ✅ Produtos com múltiplas imagens
- ✅ Categorias e marcas
- ✅ Tamanhos disponíveis por produto
- ✅ Filtros avançados (preço, categoria, marca, busca)
- ✅ Ordenação (mais recente, preço, nome)
- ✅ Paginação

### 📦 Pedidos

- ✅ Guest Checkout (compra sem cadastro)
- ✅ Checkout autenticado
- ✅ Criação automática de conta para guests
- ✅ Idempotência (previne pedidos duplicados)
- ✅ Cálculo automático de frete
- ✅ Gestão de status (pending, paid, shipped, delivered, canceled, refunded)
- ✅ **Conversão automática de size ID para nome** (ex: "1" → "M")

### 💳 Pagamentos

- ✅ Integração com Mercado Pago
- ✅ PIX, cartão de crédito, boleto
- ✅ Webhooks para atualização automática de status
- ✅ Reembolsos

### 👤 Usuários

- ✅ Autenticação JWT
- ✅ Cadastro e login
- ✅ Gestão de perfil
- ✅ Endereços salvos
- ✅ Sistema de permissões (admin/user)

### 🔧 Admin

- ✅ Dashboard com estatísticas
- ✅ Gestão de produtos, categorias, marcas
- ✅ Gestão de pedidos
- ✅ Filtros por período

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 22.x ou superior
- **PostgreSQL** 14+ (ou Docker)
- **npm** ou **yarn**
- Conta **Mercado Pago** (para pagamentos)

### Instalação

1. **Clone o repositório:**

```bash
git clone https://github.com/andsantosx/order-api.git
cd order-api
```

2. **Instale as dependências:**

```bash
npm install
```

3. **Configure as variáveis de ambiente:**

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/order_db

# JWT
JWT_SECRET=seu_secret_super_seguro_minimo_32_caracteres

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token

# Server
PORT=3000
NODE_ENV=development

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173
```

4. **Execute as migrations:**

```bash
npm run build
npm start
# As migrations rodarm automaticamente na primeira execução
```

5. **Popular o banco (opcional):**

```bash
npm run seed
```

### Rodando Localmente

```bash
# Desenvolvimento (hot-reload)
npm run dev

# Produção
npm run build
npm start
```

O servidor estará disponível em `http://localhost:3000`.

Acesse o health check: `http://localhost:3000/health`

---

## 🏛️ Arquitetura

Este projeto segue **MVC + Services + Repository Pattern** com TypeScript e TypeORM:

```
src/
├── api/
│   ├── controllers/      # Recebem requisições HTTP e delegam para Services
│   ├── services/         # Lógica de negócio e orquestração de repositórios
│   ├── entities/         # Modelos do banco (TypeORM Entities)
│   ├── routes/           # Definição de rotas e endpoints
│   ├── middlewares/      # Auth, validação, rate limiting, error handling
│   └── schemas/          # Validação de entrada com Zod
├── config/               # Configurações (logger, rate limits, env)
├── constants/            # Constantes do sistema
├── utils/                # Utilitários (sanitização, transações)
├── data-source.ts        # Configuração do TypeORM
└── server.ts             # Inicialização do Express
```

### Camadas

| Camada          | Responsabilidade                                               |
| --------------- | -------------------------------------------------------------- |
| **Controllers** | Recebem requisições HTTP, validam entrada, chamam Services     |
| **Services**    | Lógica de negócio, validações, orquestração de repositórios    |
| **Entities**    | Definem schema do banco de dados (TypeORM)                     |
| **Middlewares** | Autenticação JWT, validação Zod, rate limiting, error handling |
| **Routes**      | Mapeiam URLs para Controllers                                  |
| **Schemas**     | Validação de entrada com Zod                                   |

### Fluxo de Requisição

```
Request → Middleware (auth/validation) → Controller → Service → Repository → Database
                                                               ↓
Response ← Controller ← Service ← Repository ← Database
```

---

## 📚 Documentação da API

### 📦 Coleção Postman

Importe o arquivo **`postman_collection.json`** no Postman para ter acesso completo a:

- ✅ Todos os endpoints documentados
- ✅ Exemplos de requisições e respostas
- ✅ Testes automatizados
- ✅ Salvamento automático de tokens e IDs
- ✅ Variáveis de ambiente pré-configuradas

📖 **Guia de uso:** Consulte [`POSTMAN_GUIDE.md`](./POSTMAN_GUIDE.md) para instruções detalhadas.

### Base URL

- **Produção**: `https://order-api.up.railway.app`
- **Local**: `http://localhost:3000`

### Endpoints Principais

#### 🔐 Autenticação

```http
POST /api/auth/register   # Criar conta
POST /api/auth/login      # Fazer login
GET  /api/auth/me         # Obter perfil (requer autenticação)
PUT  /api/auth/me         # Atualizar perfil (requer autenticação)
```

#### 🛍️ Produtos

```http
GET    /api/products           # Listar produtos (com filtros e paginação)
GET    /api/products/filters   # Obter filtros disponíveis
GET    /api/products/:id       # Detalhes de um produto
POST   /api/products           # Criar produto (admin)
PUT    /api/products/:id       # Atualizar produto (admin)
DELETE /api/products/:id       # Deletar produto (admin)
```

#### 📦 Pedidos

```http
GET  /api/orders        # Listar pedidos do usuário
GET  /api/orders/:id    # Detalhes de um pedido
POST /api/orders        # Criar pedido (guest ou autenticado)
PUT  /api/orders/:id/status   # Atualizar status (admin)
POST /api/orders/:id/cancel   # Cancelar pedido
POST /api/orders/:id/refund   # Reembolsar pedido (admin)
```

#### 💳 Pagamentos

```http
POST /api/payments/process   # Processar pagamento
POST /api/payments/webhook   # Webhook Mercado Pago
```

#### 🏷️ Catálogo

```http
GET    /api/categories       # Listar categorias
POST   /api/categories       # Criar categoria (admin)
PUT    /api/categories/:id   # Atualizar categoria (admin)
DELETE /api/categories/:id   # Deletar categoria (admin)

GET    /api/brands           # Listar marcas
POST   /api/brands           # Criar marca (admin)
PUT    /api/brands/:id       # Atualizar marca (admin)
DELETE /api/brands/:id       # Deletar marca (admin)

GET    /api/sizes            # Listar tamanhos
POST   /api/sizes            # Criar tamanho (admin)
```

#### 🔧 Admin

```http
GET /api/admin/orders              # Listar todos os pedidos
GET /api/admin/stats/overview      # Estatísticas do dashboard
```

### ⚠️ Importante: Campo `size` nos Pedidos

O campo `size` deve ser enviado como **ID do tamanho** (string):

```json
✅ CORRETO:
{
  "items": [{
    "productId": "uuid",
    "quantity": 1,
    "size": "1"  // ID do tamanho
  }]
}
```

O backend irá **automaticamente converter** o ID para o nome do tamanho antes de salvar:

- Frontend envia: `"size": "1"`
- Backend busca o tamanho com ID 1
- Backend salva: `"size": "M"`
- Resposta retorna: `"size": "M"`

### 💰 Valores Monetários

Todos os preços são em **centavos**:

- R$ 50,00 = `5000`
- R$ 149,90 = `14990`
- R$ 1.000,00 = `100000`

---

## 🛠️ Tecnologias

### Core

- **Runtime**: Node.js 22.x
- **Framework**: Express 5.x
- **Linguagem**: TypeScript 5.x

### Banco de Dados

- **ORM**: TypeORM 0.3.x
- **Database**: PostgreSQL 14+
- **Migrations**: TypeORM CLI

### Validação & Segurança

- **Validação**: Zod
- **Autenticação**: JWT (jsonwebtoken)
- **Criptografia**: bcryptjs
- **Security Headers**: Helmet
- **Rate Limiting**: express-rate-limit

### Pagamentos

- **Gateway**: Mercado Pago SDK

### Utilitários

- **Logger**: Winston
- **CORS**: cors
- **Env**: dotenv

---

## 🛡️ Segurança

### Implementações de Segurança

| Recurso            | Implementação                            |
| ------------------ | ---------------------------------------- |
| **Senhas**         | Hash com bcrypt (10 rounds)              |
| **JWT**            | Tokens expiram em 24 horas               |
| **Validação**      | Zod valida todos os inputs               |
| **CORS**           | Whitelist de origens permitidas          |
| **Rate Limiting**  | Proteção contra brute force e spam       |
| **Helmet**         | Security headers HTTP                    |
| **SQL Injection**  | Proteção automática via TypeORM          |
| **Transações**     | Rollback automático em caso de erro      |
| **Error Handling** | Middleware global captura todos os erros |
| **Sanitização**    | Limpeza de inputs (CEP, endereços)       |

### Rate Limits

| Endpoint             | Limite           |
| -------------------- | ---------------- |
| `/api/auth/login`    | 5 req / 15 min   |
| `/api/auth/register` | 5 req / 15 min   |
| `/api/orders`        | 10 req / min     |
| Geral                | 100 req / 15 min |

---

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor com hot-reload

# Build
npm run build            # Compila TypeScript

# Produção
npm start                # Executa versão compilada

# Utilitários
npm run seed             # Popula banco com dados de exemplo
npm run typeorm          # CLI do TypeORM
```

---

## 🌐 Deploy

### Railway (Recomendado)

1. **Conecte seu repositório** GitHub ao Railway
2. **Configure as variáveis de ambiente:**
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `MERCADOPAGO_ACCESS_TOKEN`
   - `FRONTEND_URL`
   - `NODE_ENV=production`

3. **O Railway executará automaticamente:**
   ```bash
   npm run build && npm start
   ```

### Docker (Alternativa)

```bash
# Build da imagem
docker build -t order-api .

# Executar container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  order-api
```

---

## 📖 Guias Complementares

- [`POSTMAN_GUIDE.md`](./POSTMAN_GUIDE.md) - Guia completo de uso da coleção Postman
- Coleção Postman: [`postman_collection.json`](./postman_collection.json)

---

## 🔄 Changelog

### v2.0.0 - Última Atualização

- ✅ Conversão automática de size ID → nome
- ✅ Coleção Postman completa com testes automatizados
- ✅ Documentação detalhada
- ✅ Sistema de marcas (brands)
- ✅ Múltiplas imagens por produto
- ✅ Dashboard admin com estatísticas
- ✅ Guest checkout melhorado
- ✅ Rate limiting configurável
- ✅ Logging estruturado com Winston

---

## 📝 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👨‍💻 Autor

**Anderson Santos**

- GitHub: [@andsantosx](https://github.com/andsantosx)
- Email: contato@andersonsantos.dev

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📞 Suporte

Encontrou um bug ou tem uma sugestão?

- Abra uma [issue](https://github.com/andsantosx/order-api/issues)
- Entre em contato via email

---

⭐ **Se este projeto foi útil, considere dar uma estrela!**
