<div align="center">
  <h1>⚙️ ORDER | API Backend</h1>
  <p><strong>E-commerce RESTful API em Clean Architecture</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/TypeORM-0.3-E83524?style=for-the-badge&logo=typeorm&logoColor=white" alt="TypeORM" />
    <img src="https://img.shields.io/badge/Mercado%20Pago-Integrated-00B1EA?style=for-the-badge&logo=mercadopago&logoColor=white" alt="Mercado Pago" />
  </p>

  <p>
    <em>Motor transacional robusto com segurança enterprise, pagamentos automatizados e arquitetura escalável</em>
  </p>
</div>

<br />

> [!NOTE]
> **Status:** Em produção operando 24/7 | Deploy automático via Railway

---

## 🎯 Por que este projeto é diferenciado?

Este não é um backend "tutorial". É uma **API enterprise-grade** que orquestra operações críticas de e-commerce:

### 🏗️ Arquitetura
- **Clean Architecture**: Separação total entre domínio, aplicação e infraestrutura
- **SOLID Principles**: Cada camada com responsabilidade única e bem definida
- **Dependency Injection**: Inversão de controle para testabilidade máxima
- **TypeScript Strict**: Tipagem forte em 100% do código

### 🔒 Segurança
- **Zero Trust**: Autenticação JWT com httpOnly cookies (anti-XSS)
- **Rate Limiting**: Limites contextuais por endpoint (ex: `/auth` mais restritivo)
- **Validação Rigorosa**: Zod schemas em todas as entradas
- **Sanitização SQL**: TypeORM com queries parametrizadas (anti-injection)
- **Helmet**: CSP, HSTS, X-Frame-Options configurados
- **CORS Restrito**: Whitelist de domínios permitidos

### 💳 Pagamentos & Webhooks
- **Mercado Pago**: Integração completa (PIX, Cartão, Boleto)
- **Webhooks IPN**: Atualização automática de status em tempo real
- **Idempotência**: Proteção contra pagamentos duplicados
- **Transações Atômicas**: Rollback automático em falhas

### ⚡ Performance
- **Database Indexing**: Índices otimizados para queries frequentes
- **Connection Pooling**: Pool de conexões configurado
- **Query Optimization**: Eager/Lazy loading estratégico
- **Caching**: Cache de produtos em destaque

---

## 📊 Visão da Arquitetura

```mermaid
graph TD
    A[Cliente HTTP] -->|Requisições| B[Middlewares]
    B -->|Rate Limit| C[Auth Middleware]
    C -->|Validação Zod| D[Controllers]
    D -->|Regras de Negócio| E[Services/Use Cases]
    E -->|Operações de Domínio| F[Entities]
    E -->|Persistência| G[TypeORM Repositories]
    G -->|Transações SQL| H[(PostgreSQL)]
    
    I[Mercado Pago Webhook] -->|IPN| J[Payment Webhook Handler]
    J -->|Atualiza Status| E
    
    K[Socket.io] -->|Eventos Real-time| D
    
    style B fill:#ffe6e6,stroke:#ff4d4d,stroke-width:2px,color:#000
    style C fill:#fff3e6,stroke:#ff9800,stroke-width:2px,color:#000
    style D fill:#e6e6e6,stroke:#333,stroke-width:2px,color:#000
    style E fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#000
    style F fill:#cce5ff,stroke:#007bff,stroke-width:2px,color:#000
    style G fill:#f0e6ff,stroke:#6610f2,stroke-width:2px,color:#000
    style H fill:#d1ecf1,stroke:#17a2b8,stroke-width:2px,color:#000
```

---

## 🚀 Funcionalidades Principais

### 👤 Autenticação & Autorização
- ✅ Registro e login com bcrypt (12 rounds)
- ✅ JWT com expiração configurável
- ✅ Refresh tokens (opcional)
- ✅ Roles: `user`, `admin`
- ✅ Guest checkout automático (auto-criação de conta)

### 🛍️ Catálogo de Produtos
- ✅ CRUD completo de produtos
- ✅ Upload de múltiplas imagens
- ✅ Filtros avançados (categoria, marca, tamanho, preço)
- ✅ Produtos em destaque (`isFeatured`) com índice otimizado
- ✅ Busca por texto (nome, descrição)

### 🛒 Carrinho & Pedidos
- ✅ Criação de pedidos com validação de estoque
- ✅ Cálculo automático de frete (integração futura)
- ✅ Customização de produtos (nome, número)
- ✅ Desconto + customização separados (não se anulam)
- ✅ Histórico completo de pedidos

### 💳 Pagamentos
- ✅ Mercado Pago: PIX, Cartão, Boleto
- ✅ Webhooks IPN com assinatura verificada
- ✅ Status em tempo real (`pending`, `paid`, `cancelled`)
- ✅ Notificação por email (Mailjet)
- ✅ Breakdown de preços (produto + customização)

### 📧 Comunicação
- ✅ Emails transacionais (Mailjet)
- ✅ Confirmação de pedido com detalhes
- ✅ Notificação de pagamento aprovado
- ✅ Templates HTML responsivos

### 🔔 Real-time
- ✅ Socket.io para atualizações de status
- ✅ Notificações de novos pedidos no admin
- ✅ Sincronização automática de estoque

---

## 📚 Documentação Técnica

| Documento | Conteúdo |
|-----------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Clean Architecture, SOLID, fluxo de dados |
| [SECURITY.md](docs/SECURITY.md) | Protocolos de segurança, rate limits, auditoria |
| [API.md](docs/API.md) | Documentação de endpoints, payloads, responses |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, Railway, migrations, env vars |
| [REALTIME_AND_WEBHOOKS.md](docs/REALTIME_AND_WEBHOOKS.md) | Socket.io e integração Mercado Pago |

---

## 🛠️ Stack Tecnológica

### Core
- **Runtime**: Node.js 22.x (LTS)
- **Language**: TypeScript 5.6 (Strict Mode)
- **Framework**: Express 5.x
- **ORM**: TypeORM 0.3.x
- **Database**: PostgreSQL 16
- **Validation**: Zod

### Segurança
- **Auth**: jsonwebtoken + bcrypt
- **Security**: Helmet, CORS, Express Rate Limit
- **Sanitization**: class-validator, class-transformer

### Integrações
- **Payments**: Mercado Pago SDK
- **Email**: Mailjet API
- **Real-time**: Socket.io
- **Storage**: Cloudinary (imagens)

### DevOps
- **Build**: SWC (super rápido)
- **Tests**: Jest + Supertest
- **Lint**: ESLint + Prettier
- **CI/CD**: GitHub Actions → Railway

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 22.x ou superior
- PostgreSQL 16+ rodando
- Conta Mercado Pago (credenciais de teste/produção)
- Conta Mailjet (API keys)

### Instalação

```bash
# 1. Clonar repositório
git clone https://github.com/andsantosx/order-api.git
cd order-api

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais (veja seção abaixo)
```

### Configuração `.env`

```env
# Servidor
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database (Development)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=order_dev

# Database (Production) - Railway fornece automaticamente
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT
JWT_SECRET=sua-chave-super-secreta-aqui-min-32-chars
JWT_EXPIRES_IN=24h

# Mercado Pago
MP_ACCESS_TOKEN=TEST-1234567890-seu-token-aqui
MP_WEBHOOK_SECRET=sua-chave-webhook-aqui

# Mailjet
MAILJET_API_KEY=sua-api-key
MAILJET_API_SECRET=sua-api-secret
MAILJET_FROM_EMAIL=noreply@ordersc.com.br
MAILJET_FROM_NAME=ORDER

# Cloudinary (Upload de Imagens)
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret

# Admin Email (para notificações)
ADMIN_EMAIL=admin@ordersc.com.br
```

### Desenvolvimento com Docker (Recomendado)

```bash
# 1. Subir PostgreSQL via Docker Compose
npm run docker:up

# 2. Rodar migrations para criar tabelas
npm run migration:run

# 3. Popular banco com dados de exemplo
npm run seed

# 4. Iniciar servidor em modo watch (hot reload)
npm run dev
# API rodando em: http://localhost:5000
```

### Desenvolvimento Sem Docker

```bash
# 1. Certifique-se que PostgreSQL está rodando
# 2. Configure .env com credenciais do seu PostgreSQL
# 3. Rodar migrations
npm run migration:run

# 4. Popular banco
npm run seed

# 5. Iniciar servidor
npm run dev
```

---

## 🧪 Testes & Qualidade

### Rodar Testes
```bash
# Suite completa
npm test

# Com cobertura
npm run test:cov

# Watch mode
npm run test:watch
```

### Lint & Type Check
```bash
# ESLint
npm run lint

# Fix automático
npm run lint:fix

# TypeScript check
npm run type-check
```

### Build para Produção
```bash
# Build otimizado com SWC
npm run build

# Rodar build
npm start
```

---

## 📊 Segurança

### Checklist de Segurança Implementado
- ✅ **Autenticação**: JWT em httpOnly cookies (sem localStorage)
- ✅ **Senhas**: Bcrypt com 12 rounds
- ✅ **Validação**: Zod schemas em 100% dos endpoints
- ✅ **Sanitização**: SQL Injection prevenido via TypeORM
- ✅ **Rate Limiting**: 100 req/15min (auth), 500 req/15min (geral)
- ✅ **CORS**: Whitelist de domínios
- ✅ **Headers**: Helmet com CSP, HSTS, X-Frame-Options
- ✅ **Logs**: Sem dados sensíveis (senhas, tokens)
- ✅ **Webhooks**: Assinatura verificada (Mercado Pago)
- ✅ **Dependências**: 0 vulnerabilidades npm

### Auditoria de Vulnerabilidades
```bash
# Checar vulnerabilidades
npm audit

# Fix automático (se possível)
npm audit fix
```

---

## 🚢 Deploy

### Railway (Produção Atual)

1. **Conectar GitHub**: Railway detecta automaticamente
2. **Configurar Variáveis**: Adicionar todas as env vars do `.env.example`
3. **Database**: Railway provisiona PostgreSQL automaticamente (`DATABASE_URL`)
4. **Deploy**: Push para `main` → deploy automático

### Docker (Alternativa)

```bash
# Build da imagem
docker build -t order-api .

# Rodar container
docker run -p 5000:5000 --env-file .env order-api
```

---

## 📡 Endpoints Principais

### Autenticação
```
POST   /api/auth/register     # Registrar novo usuário
POST   /api/auth/login        # Login
POST   /api/auth/logout       # Logout
GET    /api/auth/me           # Perfil do usuário autenticado
```

### Produtos
```
GET    /api/products          # Listar produtos (filtros: category, brand, isFeatured)
GET    /api/products/:id      # Detalhes de um produto
POST   /api/products          # Criar produto (admin)
PUT    /api/products/:id      # Atualizar produto (admin)
DELETE /api/products/:id      # Deletar produto (admin)
```

### Pedidos
```
POST   /api/orders            # Criar pedido
GET    /api/orders            # Listar pedidos do usuário
GET    /api/orders/:id        # Detalhes de um pedido
GET    /api/admin/orders      # Listar todos pedidos (admin)
PATCH  /api/admin/orders/:id  # Atualizar status (admin)
```

### Pagamentos
```
POST   /api/payments/webhook  # Webhook Mercado Pago (IPN)
```

**Documentação completa:** [docs/API.md](docs/API.md)

---

## 🤝 Contribuindo

Este é um projeto privado. Se você foi convidado:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Siga os padrões de código (ESLint + Prettier)
4. **Nunca commite dados sensíveis** (veja [CLAUDE.md](CLAUDE.md))
5. Commit com mensagens semânticas (`feat:`, `fix:`, `chore:`)
6. Push e abra um Pull Request

---

## 📄 Licença

© 2026 **ORDER**. Todos os direitos reservados.

Este software é proprietário e confidencial. Uso não autorizado é estritamente proibido.

---

<div align="center">
  <sub>Construído com precisão e segurança por <a href="https://github.com/andsantosx">Anderson Santos</a></sub>
  <br />
  <sub>Backend robusto para quem busca excelência técnica.</sub>
</div>
