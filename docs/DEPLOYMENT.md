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

> [!CAUTION]
> **SEGURANÇA**: Jamais armazene credenciais reais no código ou documentação. 
> Utilize arquivos `.env` locais ou segredos no seu provedor de nuvem.

- `DB_HOST`: Host (ex: `localhost` ou o nome do serviço no Docker Compose)
- `DB_PORT`: Porta padrão do banco
- `DB_NAME`: Nome da base de dados
- `DB_USER`: Usuário com permissões adequadas
- `DB_PASSWORD`: Senha forte
- `JWT_SECRET`: Chave secreta para tokens (Mín 32-64 chars aleatórios)
- `MERCADOPAGO_ACCESS_TOKEN`: Token de API securizado
- `MERCADOPAGO_WEBHOOK_SECRET`: Secret de validação de webhook

### Opcionais
- `PORT`: Porta da aplicação
- `NODE_ENV`: Ambiente (development/production)
- `FRONTEND_URL`: Domínio autorizado para CORS

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

Para desenvolvimento local com Docker, o **Docker Compose** é o método preferido, pois gerencia o banco de dados e a aplicação juntos:

```bash
# Iniciar ambiente completo
docker compose up -d

# Ver logs
docker compose logs -f
```

O arquivo `docker-compose.yml` está configurado para ler automaticamente as variáveis do seu arquivo `.env`.

### Rodando apenas o container da API (Imagem Fixa)
Se precisar rodar apenas a imagem da API isoladamente:
```bash
# Build da imagem
docker build -t order-api .

# Rodar container
docker run --env-file .env -p 3000:3000 order-api
```
