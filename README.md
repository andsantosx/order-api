<div align="center">
  <h1>⚙️ ORDER | API Backend</h1>
  <p><strong>E-commerce RESTful API em Clean Architecture</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/TypeORM-0.3-E83524?style=for-the-badge&logo=typeorm&logoColor=white" alt="TypeORM" />
  </p>

  <p>
    <em>Motor transacional robusto com segurança enterprise e pagamentos automatizados</em>
  </p>
</div>

<br />

> [!NOTE]
> **Status:** Em produção operando 24/7 | Deploy automático via Railway

---

## 🎯 Principais Features

- 🏗️ **Clean Architecture** - Separação total entre domínio, aplicação e infraestrutura (SOLID)
- 🔒 **Segurança Enterprise** - JWT httpOnly, Rate Limiting, Zod validation, SQL injection protection
- 💳 **Pagamentos Automáticos** - Mercado Pago (PIX, Cartão, Boleto) + Webhooks IPN em tempo real
- 📧 **Emails Transacionais** - Mailjet com templates responsivos
- 🔔 **Real-time** - Socket.io para notificações de pedidos e status
- ⚡ **Performance** - Índices otimizados, connection pooling, eager/lazy loading
- 🛡️ **Zero Vulnerabilidades** - Dependências auditadas, bcrypt (12 rounds), TypeScript strict

---

## 🚀 Início Rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/andsantosx/order-api.git
cd order-api
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Subir banco de dados via Docker
npm run docker:up

# 4. Rodar migrations e seed
npm run migration:run
npm run seed

# 5. Iniciar em desenvolvimento
npm run dev
# API rodando em: http://localhost:5000
```

### Variáveis de Ambiente Essenciais

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT
JWT_SECRET=sua-chave-min-32-chars
JWT_EXPIRES_IN=24h

# Mercado Pago
MP_ACCESS_TOKEN=seu-token
MP_WEBHOOK_SECRET=sua-chave-webhook

# Mailjet
MAILJET_API_KEY=sua-api-key
MAILJET_API_SECRET=sua-api-secret

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173
```

*Veja [.env.example](.env.example) para lista completa*

---

## 🛠️ Stack Tecnológica

| Categoria | Tecnologias |
|-----------|-------------|
| **Core** | Node.js 22.x, TypeScript 5.6 (Strict), Express 5.x |
| **Database** | PostgreSQL 16, TypeORM 0.3 |
| **Segurança** | JWT, bcrypt, Helmet, CORS, Express Rate Limit |
| **Validação** | Zod |
| **Pagamentos** | Mercado Pago SDK |
| **Email** | Mailjet API |
| **Real-time** | Socket.io |
| **Build** | SWC (super rápido) |

---

## 📚 Documentação Completa

| Documento | Conteúdo |
|-----------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Clean Architecture, SOLID, fluxo de dados, diagramas |
| [SECURITY.md](docs/SECURITY.md) | Protocolos de segurança, rate limits, auditoria |
| [API.md](docs/API.md) | Todos os endpoints, payloads, responses, autenticação |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, Railway, migrations, variáveis de ambiente |
| [REALTIME_AND_WEBHOOKS.md](docs/REALTIME_AND_WEBHOOKS.md) | Socket.io e integração Mercado Pago |

---

## 🧪 Testes & Qualidade

```bash
# Testes
npm test              # Suite completa
npm run test:cov      # Com cobertura

# Lint & Build
npm run lint          # ESLint + Prettier
npm run build         # Build com SWC
npm start             # Rodar build

# Segurança
npm audit             # Checar vulnerabilidades
```

---

## 📡 Endpoints Principais

```
# Autenticação
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

# Produtos
GET    /api/products          # Filtros: category, brand, isFeatured
GET    /api/products/:id
POST   /api/products          # Admin apenas

# Pedidos
POST   /api/orders            # Criar pedido
GET    /api/orders            # Listar do usuário
GET    /api/admin/orders      # Admin: todos pedidos

# Pagamentos
POST   /api/payments/webhook  # Mercado Pago IPN
```

*Documentação completa: [docs/API.md](docs/API.md)*

---

## 🚢 Deploy

### Railway (Produção)
1. Conectar GitHub → deploy automático em push para `main`
2. Configurar variáveis de ambiente (veja [DEPLOYMENT.md](docs/DEPLOYMENT.md))
3. Railway provisiona PostgreSQL automaticamente (`DATABASE_URL`)

### Docker
```bash
docker build -t order-api .
docker run -p 5000:5000 --env-file .env order-api
```

---

## 📄 Licença

© 2026 **ORDER**. Todos os direitos reservados.

<div align="center">
  <sub>Construído por <a href="https://github.com/andsantosx">Anderson Santos</a></sub>
</div>
