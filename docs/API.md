# Especificação da API (Technical Reference)

Este documento descreve os padrões técnicos, fluxos de autenticação e contratos da API. Para a lista interativa de endpoints, consulte o [Swagger UI](/api-docs).

## 1. Padrões de Comunicação

### Formato de Dados
- **Request/Response Content-Type**: `application/json`
- **Datas**: ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Moeda**: Valores monetários trafegados como **inteiros** em **centavos** (ex: R$ 10,00 -> `1000`).

### Status Codes
| Código | Significado | Uso |
|:---:|---|---|
| `200` | OK | Sucesso em GET, PUT, PATCH |
| `201` | Created | Sucesso em POST (criação) |
| `204` | No Content | Sucesso sem corpo de resposta (DELETE) |
| `400` | Bad Request | Erro de validação ou regra de negócio |
| `401` | Unauthorized | Token ausente ou inválido |
| `403` | Forbidden | Token válido, mas sem permissão (ex: Admin only) |
| `404` | Not Found | Recurso não encontrado |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Internal Server Error | Erro inesperado no servidor |

## 2. Autenticação e Segurança

### JWT (JSON Web Token)
O sistema utiliza autenticação via Bearer Token.

- **Header**: `Authorization: Bearer <token>`
- **Algoritmo**: HS256
- **Expiração**: 1 dia
- **Payload**:
  ```json
  {
    "userId": "uuid",
    "email": "user@example.com",
    "isAdmin": false,
    "iat": 1700000000,
    "exp": 1700086400
  }
  ```

### Fluxo de Login
1. `POST /auth/login` com email e senha.
2. Servidor retorna `token` e dados do `user`.
3. Frontend armazena token (LocalStorage/Cookie).
4. Próximas requisições incluem o token no header.

## 3. Webhooks (Mercado Pago)

A API aceita notificações de pagamento via Webhook.

- **Endpoint**: `POST /payments/webhook`
- **Validação de Segurança**:
  - Verifica parâmetro `type=payment`.
  - Verifica assinatura `x-signature` usando HMAC-SHA256 (Prod).
  - Consulta status real na API do Mercado Pago para evitar spoofing.

## 4. Paginação

Endpoints de listagem (`GET /orders`, `GET /products`) suportam paginação via query params:

- `page`: Número da página (início: 1)
- `limit`: Itens por página (default: 20)

**Resposta Padrão de Paginação**:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

## 5. Tratamento de Erros

Todas as respostas de erro seguem o formato padrão (`AppError`):

```json
{
  "status": "error",
  "message": "Descrição detalhada do erro para display"
}
```

Erros de validação (Zod) retornam detalhes adicionais:

```json
{
  "status": "error",
  "message": "Erro de validação",
  "errors": [
    { "field": "email", "message": "Email inválido" }
  ]
}
```
