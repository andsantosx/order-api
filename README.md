# Order API

Uma API simples para gerenciar pedidos e produtos.

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
npm install
```

### Variáveis de Ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

### Desenvolvimento

```bash
npm run dev
```

O servidor rodará em `http://localhost:3000`

### Build para Produção

```bash
npm run build
npm start
```

## 📚 Endpoints

### Health Check
```
GET /health
```

### Produtos
```
GET /api/products           # Lista todos os produtos
GET /api/products/:id       # Detalhes de um produto
```

### Pedidos
```
GET /api/orders             # Lista todos os pedidos
POST /api/orders            # Criar novo pedido
```

### Exemplo de POST para criar pedido

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "João Silva",
    "items": ["Notebook", "Mouse"],
    "totalPrice": 2650.00
  }'
```

## 🌐 Deploy na Vercel

1. Faça push do código para GitHub
2. Vá em [vercel.com](https://vercel.com)
3. Clique em "Add New..." → "Project"
4. Selecione seu repositório `order-api`
5. Vercel detectará automaticamente a configuração
6. Deploy automático! 🎉

## 📝 Estrutura do Projeto

```
order-api/
├── src/
│   └── server.ts         # Arquivo principal da aplicação
├── dist/                 # Código compilado (gerado após build)
├── package.json
├── tsconfig.json
├── vercel.json           # Configuração para Vercel
├── .env.example
└── README.md
```

## 🛠️ Tecnologias

- Express.js
- TypeScript
- Node.js
- CORS