# 🛒 Order API - E-commerce Completo

API REST completa para e-commerce de roupas com sistema de pedidos, pagamentos via Mercado Pago, autenticação JWT e gestão de catálogo.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)
![ESLint](https://img.shields.io/badge/ESLint-Flat_Config-4B32C3.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791.svg)

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Início Rápido](#-início-rápido)
- [Arquitetura](#️-arquitetura)
- [Tecnologias](#️-tecnologias)
- [Segurança](#️-segurança)
- [Documentação Detalhada](#-documentação-detalhada)
- [Deploy](#-deploy)

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 22.x+
- **PostgreSQL** 14+
- **Mercado Pago** Credentials

### Docker (Recomendado)

O projeto está configurado para rodar completamente via Docker, garantindo paridade de ambiente e isolamento de banco de dados para testes.

```bash
# Iniciar ambiente (App + DB)
npm run docker:up

# Rodar testes (Banco isolado: order_db_test)
docker exec order-api-app-1 npm test

# Linting e Formatação
docker exec order-api-app-1 npm run lint
docker exec order-api-app-1 npm run format
```

### Instalação Local

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
_Configure o arquivo `.env` com suas credenciais locais._

4. **Execute o projeto:**
```bash
npm run dev
```

---

## 🏛️ Arquitetura

Este projeto segue **MVC + Services + Transações Atômicas** com TypeScript e TypeORM, priorizando segurança e integridade de dados.

```
src/
├── api/
│   ├── controllers/      # Call handlers
│   ├── services/         # Business logic
│   ├── entities/         # DB Models
│   ├── routes/           # Endpoints
│   ├── middlewares/      # Security & Validation
│   └── schemas/          # Zod validation
├── config/               # Environment & Global config
└── utils/                # Transactions & Sanitizers
```

---

## 📚 Documentação Detalhada

A documentação completa do projeto encontra-se na pasta [`/docs`](./docs):

- [📢 API Reference (Swagger)](docs/API.md)
- [🏗️ Arquitetura](docs/ARCHITECTURE.md)
- [🔒 Segurança](docs/SECURITY.md)
- [🧪 Guia de Testes](docs/TESTING.md)
- [🚀 Guia de Desenvolvimento](docs/DEVELOPMENT.md)

---

## 🛠️ Tecnologias

- **Runtime**: Node.js (v22.x)
- **Linguagem**: TypeScript (v5.6.3 Stable)
- **Framework**: Express (v5.x)
- **ORM**: TypeORM (PostgreSQL)
- **Qualidade**: ESLint (v9+ Flat Config) & Prettier
- **Validação**: Zod
- **Pagamentos**: Mercado Pago SDK
- **Logs**: Winston (Structured logging)
- **Testes**: Jest (Unit & Integration)

---

## 🛡️ Segurança

### Implementações

- **Senhas**: Hash com bcrypt
- **JWT**: Tokens de acesso e proteção de rotas
- **Rate Limiting**: Proteção agressiva em `/auth` e `/payments`
- **Sanitização**: Input cleaning contra XSS em todos os campos
- **Whitelisting**: Domínios de imagem permitidos via SSRF protection

---

## 🌐 Deploy

O projeto inclui um `Dockerfile` pronto para produção. Recomendado o uso de contêineres para garantir que as versões de TypeScript e ESLint sejam mantidas consistentemente.

---

## 👨‍💻 Autor

**Anderson Santos**
- Email: andersonsantoss.dev@gmail.com

---
