# 🚀 Guia de Desenvolvimento

## ⚠️ Protocolo Obrigatório
> **LEIA ISTO PRIMEIRO**: Antes de qualquer alteração, consulte o [Protocolo de Manutenção](PROTOCOL.md).
> Todas as mudanças exigem atualização de testes e documentação.

## 🐳 Docker

Para rodar o ambiente completo (App + Banco):

```bash
npm run docker:up
# ou: docker compose up -d
```

Para parar:

```bash
npm run docker:down
# ou: docker compose down
```

## 🧪 Testes

Os testes rodam em um banco **PostgreSQL** dedicado e **isolado** (`order_db_test`). Esta isolação permite que você rode os testes e o servidor de desenvolvimento simultaneamente sem conflitos de banco de dados.

Rodar todos os testes dentro do container:
```bash
docker exec -e DB_HOST=db order-api-app-1 npm test
```

Rodar testes locais (requer banco configurado):
```bash
npm test
```

## ✨ Qualidade de Código (Dentro do Docker)

Para garantir consistência e evitar disparidades de ambiente, rode os scripts de qualidade dentro do container. O projeto utiliza o **ESLint Flat Config** (v9+).

**Linting:**
```bash
docker exec order-api-app-1 npm run lint
```

**Formatação:**
```bash
docker exec order-api-app-1 npm run format
```

## 📚 Documentação API (Swagger)

Acesse a documentação interativa em:
`http://localhost:3000/api-docs`
(Necessário o servidor estar rodando)
