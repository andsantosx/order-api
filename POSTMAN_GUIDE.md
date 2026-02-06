# 📚 Guia de Uso da Coleção Postman - Order API

## 🚀 Como Começar

### 1. Importar a Coleção

1. Abra o Postman
2. Clique em **Import**
3. Selecione o arquivo `postman_collection.json`
4. A coleção será importada com todos os endpoints

### 2. Configurar Ambiente

A coleção já vem com variáveis pré-configuradas:

| Variável          | Descrição                                         | Valor Padrão            |
| ----------------- | ------------------------------------------------- | ----------------------- |
| `BASE_URL`        | URL base da API                                   | `http://localhost:3000` |
| `TOKEN`           | Token JWT (preenchido automaticamente após login) | -                       |
| `USER_ID`         | ID do usuário logado                              | -                       |
| `LAST_ORDER_ID`   | ID do último pedido criado                        | -                       |
| `LAST_PRODUCT_ID` | ID do último produto criado                       | -                       |

### 3. Fluxo de Autenticação

```
1. Execute: "Auth > Register" ou "Auth > Login"
2. O token será salvo automaticamente na variável {{TOKEN}}
3. Todas as requisições autenticadas usarão esse token
```

## 📋 Fluxos Comuns

### Fluxo 1: Criar um Pedido (Guest Checkout)

```
1. GET /api/products - Buscar produtos disponíveis
2. GET /api/sizes - Buscar tamanhos disponíveis
3. POST /api/orders - Criar pedido (sem autenticação)
   - Enviar size como ID (ex: "1", "2")
   - O backend converte automaticamente para nome (ex: "M", "G")
4. POST /api/payments/process - Processar pagamento
```

### Fluxo 2: Criar um Pedido (Usuário Autenticado)

```
1. POST /api/auth/login - Fazer login
2. GET /api/products - Buscar produtos
3. POST /api/orders - Criar pedido (com token)
4. POST /api/payments/process - Processar pagamento
```

### Fluxo 3: Admin - Gerenciar Produtos

```
1. POST /api/auth/login - Login como admin
2. POST /api/products - Criar produto
3. PUT /api/products/:id - Atualizar produto
4. DELETE /api/products/:id - Deletar produto
```

## 🔑 Pontos Importantes

### ⚠️ Campo `size` nos Pedidos

**IMPORTANTE:** O campo `size` deve ser enviado como **ID do tamanho**, não o nome!

```json
✅ CORRETO:
{
  "items": [{
    "productId": "uuid",
    "quantity": 1,
    "size": "1"  // ID do tamanho
  }]
}

❌ ERRADO:
{
  "items": [{
    "size": "M"  // Nome do tamanho
  }]
}
```

**O que acontece:**

1. Frontend envia `size: "1"` (ID)
2. Backend busca o tamanho com ID 1
3. Backend pega o nome do tamanho (ex: "M")
4. Salva o nome "M" no banco de dados
5. Retorna o pedido com `size: "M"`

### 💰 Valores Monetários

Todos os valores são em **centavos**:

- R$ 50,00 = `5000`
- R$ 149,90 = `14990`
- R$ 1.000,00 = `100000`

### 📅 Datas

Todas as datas estão no formato **ISO 8601**:

```
"2024-01-15T14:30:00Z"
```

## 🧪 Testes Automatizados

A coleção inclui testes automatizados que verificam:

- ✅ Status codes corretos
- ✅ Estrutura da resposta
- ✅ Presença de campos obrigatórios
- ✅ Salvamento automático de tokens e IDs

### Ver Resultados dos Testes

Após executar uma requisição, veja a aba **Test Results** no Postman.

## 📊 Exemplos de Respostas

### Produto

```json
{
  "id": "uuid",
  "name": "Camiseta Básica",
  "price_cents": 4990,
  "currency": "BRL",
  "description": "Camiseta 100% algodão",
  "category": {
    "id": 1,
    "name": "Camisetas"
  },
  "brand": {
    "id": 1,
    "name": "Nike"
  },
  "images": [
    {
      "id": 1,
      "url": "https://example.com/image.jpg",
      "display_order": 0
    }
  ],
  "sizes": [
    {
      "id": 1,
      "size": {
        "id": 1,
        "name": "M",
        "type": "clothing"
      }
    }
  ]
}
```

### Pedido

```json
{
  "id": "uuid",
  "total_amount": 15990,
  "currency": "BRL",
  "status": "PENDING",
  "guest_email": "guest@example.com",
  "created_at": "2024-01-15T14:30:00Z",
  "items": [
    {
      "id": "uuid",
      "quantity": 2,
      "size": "M",  // Nome do tamanho (convertido pelo backend)
      "unit_price": 4990,
      "total_price": 9980,
      "product": {
        "id": "uuid",
        "name": "Camiseta Básica",
        "images": [...]
      }
    }
  ],
  "shippingAddress": [
    {
      "id": "uuid",
      "street": "Rua Exemplo, 123",
      "city": "São Paulo",
      "state": "SP",
      "zip_code": "01234567",
      "country": "Brasil"
    }
  ]
}
```

## 🔄 Status de Pedidos

| Status      | Descrição            |
| ----------- | -------------------- |
| `PENDING`   | Aguardando pagamento |
| `PAID`      | Pagamento confirmado |
| `SHIPPED`   | Em transporte        |
| `DELIVERED` | Entregue             |
| `CANCELED`  | Cancelado            |
| `REFUNDED`  | Reembolsado          |

## 🛡️ Rate Limits

A API possui limites de requisições para evitar abuso:

| Endpoint             | Limite                       |
| -------------------- | ---------------------------- |
| `/api/auth/login`    | 5 requisições / 15 minutos   |
| `/api/auth/register` | 3 requisições / hora         |
| `/api/orders`        | 10 requisições / minuto      |
| Geral                | 100 requisições / 15 minutos |

## ❌ Tratamento de Erros

### Estrutura de Erro Padrão

```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": "VALIDATION_ERROR"
}
```

### Códigos de Erro Comuns

| Código | Descrição              | Solução                              |
| ------ | ---------------------- | ------------------------------------ |
| 400    | Dados inválidos        | Verificar formato dos dados enviados |
| 401    | Não autenticado        | Fazer login e usar o token           |
| 403    | Sem permissão          | Endpoint requer privilégios de admin |
| 404    | Recurso não encontrado | Verificar se o ID existe             |
| 429    | Rate limit excedido    | Aguardar antes de tentar novamente   |
| 500    | Erro interno           | Reportar ao backend                  |

## 🎯 Dicas para Frontend

### 1. Conversão de Preços

```javascript
// Backend retorna centavos
const priceCents = 4990;
const priceReais = priceCents / 100; // 49.90

// Para exibir
const formatted = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(priceReais); // "R$ 49,90"
```

### 2. Validação de CEP

```javascript
// CEP deve ter 8 dígitos (sem hífen)
const cep = zipCode.replace(/\D/g, ""); // "01234-567" -> "01234567"
```

### 3. Mapear Size ID para Nome

```javascript
// 1. Buscar todos os tamanhos disponíveis
const sizes = await fetch("/api/sizes").then((r) => r.json());
// [{ id: 1, name: "P" }, { id: 2, name: "M" }, ...]

// 2. Criar um map
const sizeMap = new Map(sizes.map((s) => [s.id, s.name]));

// 3. Ao criar pedido, enviar o ID
const orderData = {
  items: [
    {
      productId: "uuid",
      quantity: 1,
      size: String(selectedSizeId), // "1", "2", "3", etc.
    },
  ],
};

// 4. Backend retorna com o nome
// response.items[0].size = "M"
```

### 4. Gerenciamento de Token

```javascript
// Salvar token após login
localStorage.setItem("token", response.token);

// Incluir em todas as requisições
const headers = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
};
```

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verificar a documentação de cada endpoint no Postman
2. Consultar os exemplos de resposta
3. Verificar os testes automatizados
4. Entrar em contato com a equipe de backend

---

✨ **Boa sorte com a implementação!**
