# Order API

Uma API para um sistema de marketplace, focada no gerenciamento de produtos e pedidos.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- Docker e Docker Compose (para o banco de dados)
- npm ou yarn

### Instalação

1.  Clone o repositório:
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd order-api
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

### Variáveis de Ambiente

Copie o arquivo de exemplo `.env` e preencha com suas credenciais do banco de dados.

```bash
cp .env .env
```

### Rodando com Docker

Para subir o banco de dados PostgreSQL em um contêiner Docker:

```bash
docker-compose up -d
```

### Desenvolvimento

Para rodar a aplicação em modo de desenvolvimento com hot-reload:

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

## 🏛️ Arquitetura do Projeto

Este projeto utiliza uma arquitetura **MVC (Model-View-Controller)** adaptada para APIs REST. A estrutura principal do código-fonte está organizada da seguinte forma:

```
order-api/
└── src/
    ├── api/
    │   ├── controllers/  # C: Lógica de Negócio e Requisições
    │   ├── entities/     # M: Modelos de Dados (TypeORM Entities)
    │   └── routes/       # V: Definição de Endpoints da API
    ├── config/           # Configurações (ex: data-source.ts)
    └── server.ts         # Ponto de entrada da aplicação Express
```

-   **`entities` (Models):** Define a estrutura dos dados usando entidades do TypeORM. Cada arquivo em `entities` corresponde a uma tabela no banco de dados.
-   **`controllers` (Controllers):** Contém a lógica de negócio. Cada controller recebe as requisições das rotas, processa os dados (interagindo com os `entities`/repositórios) e retorna uma resposta.
-   **`routes` (Views/Routers):** Mapeia os endpoints da API (ex: `/api/products`) para os métodos correspondentes nos `controllers`. É a camada de entrada da aplicação.

Essa estrutura garante a separação de responsabilidades, facilitando a manutenção e a escalabilidade do projeto.

## 📚 Endpoints da API

### Health Check
-   `GET /health`: Verifica o status da aplicação.

### Produtos
-   `GET /api/products`: Lista todos os produtos.
-   `GET /api/products/:id`: Detalhes de um produto específico.
-   `POST /api/products`: Cria um novo produto.

### Pedidos
-   `GET /api/orders`: Lista todos os pedidos.
-   `GET /api/orders/:id`: Detalhes de um pedido específico.
-   `POST /api/orders`: Cria um novo pedido.

### Exemplo de POST para criar um pedido

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-do-usuario-se-logado",
    "items": [
      { "productId": "uuid-do-produto-1", "quantity": 2 },
      { "productId": "uuid-do-produto-2", "quantity": 1 }
    ]
  }'
```

## 🛠️ Tecnologias

-   Node.js
-   Express.js
-   TypeScript
-   TypeORM (para interação com o banco de dados)
-   PostgreSQL
-   Docker
