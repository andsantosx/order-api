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
| **Públicas** | `/auth`, `/categories`, `/brands`, `/sizes`, `/contact` | Público. Conta com restrições `Rate Limit` rígidas por faixa de IP. |
| **Produtos** | `/products`, `/images` | Listagem pública (Scraping limit protection) e Mutabilidade Admnistrativa (Somente Admins). |
| **Financeiro** | `/orders`, `/payments`, `/shipping` | Criação restrita para Carrinhos de Usuários (`Req.user`). Permite *Guest Checkouts*. |
| **Dashboards** | `/admin`, `/admin/stats` | Gerenciamento estrito. Requer perfil `isAdmin: boolean` em `true`. |
| **Status Realtime** | `/health` | Visão de diagnóstico dos conectores e sub-módulos (PostgreSQL e Mercado Pago). |

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
