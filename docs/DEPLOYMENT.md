# Manual de Deploy e Infraestrutura

Este documento detalha os procedimentos para deploy, configuração de ambiente e gestão de banco de dados.

## 1. Stack Tecnológico

| Componente | Tecnologia | Versão Mínima |
|---|---|---|
| **Runtime** | Node.js | 22.x (Alpine) |
| **Banco de Dados** | PostgreSQL | 14.x |
| **Container** | Docker | 20.10+ |

## 2. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env` ou no painel do provedor de nuvem (Railway/AWS):

### Críticas (Obrigatórias)
- `DATABASE_URL`: Connection string do Postgres (`postgres://user:pass@host:5432/db`)
- `JWT_SECRET`: String aleatória segura (min 32 chars) para assinar tokens.
- `MERCADOPAGO_ACCESS_TOKEN`: Token de produção do Mercado Pago.
- `MERCADOPAGO_WEBHOOK_SECRET`: Secret para validar assinaturas de webhook.

### Opcionais (Defaults Disponíveis)
- `PORT`: Porta do servidor (Default: 3000)
- `NODE_ENV`: `production` ou `development`
- `CORS_ORIGIN`: URL do frontend (Default: `*`)

## 3. Deploy na Railway

O projeto possui configuração otimizada para Railway.

1. Conecte o repositório GitHub à Railway.
2. Adicione um serviço **PostgreSQL**.
3. Adicione um serviço a partir do **Github Repositório**.
4. Configure as variáveis de ambiente no serviço da API.
5. O deploy detectará o `Dockerfile` e iniciará o build.

### Build & Start Command
O `package.json` define os scripts utilizados:

- **Build**: `npm run build` (Compila TypeScript -> JavaScript em `./dist`)
- **Start**: `npm start` (Executa migrations e inicia servidor)

> **Nota**: O commando `start` executa automaticamente `npm run migration:run:prod` antes de subir o servidor. Isso garante que o banco de dados esteja sempre sincronizado com o código.

## 4. Gestão de Banco de Dados (Migrations)

Utilizamos **TypeORM Migrations** para versionamento de schema.

### Em Desenvolvimento
Criar uma nova migration após alterar entidades:
```bash
npm run migration:generate --name=NomeDaMudanca
```
Isso cria um arquivo timestamped em `src/migrations/`.

### Em Produção
As migrations são compiladas para `.js` e executadas automaticamente no boot da aplicação.
Não é necessário rodar comandos manuais no servidor de produção.

## 5. Docker Local

Para simular o ambiente de produção localmente:

```bash
# Build da imagem
docker build -t order-api .

# Rodar container (precisa de acesso ao DB)
docker run --env-file .env -p 3000:3000 order-api
```
