# Documentação da API - Marketplace

Esta é a documentação oficial para a API do projeto de marketplace. Use estes endpoints para integrar o frontend com o backend.

**URL Base:** `http://localhost:3000` (em desenvolvimento)

---

## Fluxo de Pagamento (Visão Geral)

O processo de compra envolve 3 chamadas de API em sequência:

1.  **`POST /api/orders`**: O frontend envia os itens do carrinho para criar um pedido. O pedido é salvo no banco com status `PENDING`.
2.  **`POST /api/payments/create-intent`**: O frontend envia o ID do pedido recém-criado. O backend cria uma "Intenção de Pagamento" na Stripe e retorna um `clientSecret`.
3.  **Confirmação no Frontend**: O frontend usa o `clientSecret` com a biblioteca Stripe.js para mostrar o formulário de pagamento ao usuário. Após o pagamento, a Stripe notifica o backend (via webhook) para atualizar o status do pedido para `CONFIRMED`.

---

## 📦 Endpoints de Produtos

### 1. Listar todos os produtos

-   **Método:** `GET`
-   **URL:** `/api/products`
-   **Descrição:** Retorna uma lista com todos os produtos disponíveis.
-   **Corpo da Requisição:** N/A
-   **Resposta de Sucesso (200 OK):**
    ```json
    [
      {
        "id": "uuid-do-produto-1",
        "name": "Notebook Gamer",
        "price_cents": 1250000,
        "currency": "BRL",
        "stock": 15
      },
      {
        "id": "uuid-do-produto-2",
        "name": "Mouse sem Fio",
        "price_cents": 25000,
        "currency": "BRL",
        "stock": 100
      }
    ]
    ```

### 2. Obter um produto específico

-   **Método:** `GET`
-   **URL:** `/api/products/:id`
-   **Descrição:** Retorna os detalhes de um único produto pelo seu ID.
-   **Parâmetros da URL:**
    -   `id` (string, obrigatório): O ID do produto.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "id": "uuid-do-produto-1",
      "name": "Notebook Gamer",
      "price_cents": 1250000,
      "currency": "BRL",
      "stock": 15
    }
    ```
-   **Resposta de Erro (404 Not Found):**
    ```json
    {
      "message": "Product not found"
    }
    ```

### 3. Criar um novo produto

-   **Método:** `POST`
-   **URL:** `/api/products`
-   **Descrição:** Adiciona um novo produto ao catálogo.
-   **Corpo da Requisição (JSON):**
    ```json
    {
      "name": "Teclado Mecânico",
      "price_cents": 75000,
      "currency": "BRL",
      "stock": 50
    }
    ```
-   **Resposta de Sucesso (201 Created):**
    ```json
    {
      "id": "uuid-do-novo-produto",
      "name": "Teclado Mecânico",
      "price_cents": 75000,
      "currency": "BRL",
      "stock": 50
    }
    ```

---

## 🛒 Endpoints de Pedidos

### 1. Criar um novo pedido

-   **Método:** `POST`
-   **URL:** `/api/orders`
-   **Descrição:** Cria um novo pedido com base nos itens do carrinho. Este é o primeiro passo do fluxo de compra.
-   **Corpo da Requisição (JSON):**
    ```json
    {
      "userId": "uuid-do-usuario-logado", // Opcional, para usuários logados
      "items": [
        { "productId": "uuid-do-produto-1", "quantity": 1 },
        { "productId": "uuid-do-produto-2", "quantity": 2 }
      ]
    }
    ```
-   **Resposta de Sucesso (201 Created):** Retorna o objeto do pedido criado. **Você precisará do `id` deste pedido para o próximo passo.**
    ```json
    {
      "id": "uuid-do-novo-pedido",
      "user": { "id": "uuid-do-usuario-logado", ... },
      "items": [ ... ],
      "total_amount": 1300000,
      "currency": "BRL",
      "status": "PENDING",
      "created_at": "2024-05-22T21:00:00.000Z"
    }
    ```

### 2. Listar todos os pedidos

-   **Método:** `GET`
-   **URL:** `/api/orders`
-   **Descrição:** Retorna uma lista de todos os pedidos. (Pode ser útil para uma área de administrador).
-   **Resposta de Sucesso (200 OK):** Uma lista de objetos de pedido.

### 3. Obter um pedido específico

-   **Método:** `GET`
-   **URL:** `/api/orders/:id`
-   **Descrição:** Retorna os detalhes de um pedido específico. Útil para o cliente verificar o status do seu pedido após o pagamento.
-   **Parâmetros da URL:**
    -   `id` (string, obrigatório): O ID do pedido.
-   **Resposta de Sucesso (200 OK):**
    ```json
    {
      "id": "uuid-do-pedido",
      "status": "CONFIRMED", // ou "PENDING"
      // ...outros detalhes do pedido
    }
    ```

---

## 💳 Endpoints de Pagamento (Stripe)

### 1. Criar uma Intenção de Pagamento

-   **Método:** `POST`
-   **URL:** `/api/payments/create-intent`
-   **Descrição:** Cria uma sessão de pagamento na Stripe para um pedido existente. Este é o segundo passo do fluxo de compra.
-   **Corpo da Requisição (JSON):**
    ```json
    {
      "orderId": "uuid-do-pedido-criado-no-passo-anterior"
    }
    ```
-   **Resposta de Sucesso (201 Created):** Retorna o `clientSecret` necessário para o frontend da Stripe.
    ```json
    {
      "clientSecret": "pi_3Pxxxxxxxxxxxx_secret_xxxxxxxxxxxx"
    }
    ```
-   **O que fazer com a resposta:** O frontend deve pegar este `clientSecret` e usá-lo com a função `stripe.confirmPayment()` da biblioteca Stripe.js para finalizar o pagamento.

### 2. Webhook da Stripe

-   **Método:** `POST`
-   **URL:** `/api/payments/webhook`
-   **Descrição:** **Este endpoint é para uso exclusivo da Stripe.** O frontend **NUNCA** deve chamar este endpoint diretamente. Ele é usado pelo servidor da Stripe para notificar o backend quando um pagamento é concluído, para que o status do pedido possa ser atualizado. Nenhuma ação é necessária por parte do frontend aqui.
