# 🛒 Order API - E-commerce Completo

API REST completa para e-commerce de roupas com sistema de pedidos, pagamentos via Mercado Pago, autenticação JWT e gestão de catálogo.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791.svg)

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Início Rápido](#-início-rápido)
- [Arquitetura](#️-arquitetura)
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
- ✅ Ordenação e Paginação

### 📦 Pedidos

- ✅ Guest Checkout (compra sem cadastro)
- ✅ Checkout autenticado
- ✅ Criação automática de conta para guests
- ✅ Idempotência (previne pedidos duplicados)
- ✅ Cálculo automático de frete
- ✅ Gestão de status
- ✅ Conversão automática de IDs para nomes

### 💳 Pagamentos

- ✅ Integração com Mercado Pago
- ✅ Webhooks para atualização automática

### 👤 Usuários

- ✅ Autenticação JWT
- ✅ Gestão de perfil e endereços
- ✅ ACL (Admin/User)

### 🔧 Admin

- ✅ Dashboard com estatísticas
- ✅ Gestão completa de recursos

---

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js** 22.x+
- **PostgreSQL** 14+
- **Mercado Pago** Credentials

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

_Configure o arquivo `.env` com suas credenciais locais._

4. **Execute o projeto:**

```bash
npm run build
npm start
```

---

## 🏛️ Arquitetura

Este projeto segue **MVC + Services + Repository Pattern** com TypeScript e TypeORM.

```
src/
├── api/
│   ├── controllers/
│   ├── services/
│   ├── entities/
│   ├── routes/
│   ├── middlewares/
│   └── schemas/
├── config/
└── server.ts
```

---

## 🛠️ Tecnologias

- **Core**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, TypeORM
- **Auth**: JWT, bcryptjs
- **Validation**: Zod
- **Payments**: Mercado Pago SDK

---

## 🛡️ Segurança

### Implementações

- **Senhas**: Hash com bcrypt
- **JWT**: Tokens com expiração definida
- **Validação**: Inputs validados com Zod
- **Rate Limiting**: Proteção contra abuso
- **Helmet**: Headers de segurança HTTP
- **Sanitização**: Limpeza de dados de entrada

---

## 🌐 Deploy

### Railway / Docker

O projeto inclui configurações para deploy em contêineres. Certifique-se de configurar as variáveis de ambiente de produção corretamente (DATABASE_URL, JWT_SECRET, etc).

---

## 👨‍💻 Autor

**Anderson Santos**

- Email: andersonsantoss.dev@gmail.com

---
