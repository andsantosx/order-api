# 🛒 Order API - Documentação Técnica

API RESTful empresarial para e-commerce, construída com foco em escalabilidade, segurança e integridade de dados.

| Recurso | Doc Técnica |
|---|---|
| **Arquitetura** | [Ver Arquitetura](docs/ARCHITECTURE.md) |
| **API Spec** | [Ver Especificação](docs/API.md) |
| **Deploy** | [Ver Manual de Deploy](docs/DEPLOYMENT.md) |
| **Segurança** | [Ver Protocolos](docs/SECURITY.md) |

---

## 🏗️ Visão Geral da Arquitetura

O projeto segue os princípios de **Clean Architecture** adaptados para Node.js/TypeScript.

- **Camada de Domínio**: Entidades (`src/api/entities`) definem o núcleo do negócio.
- **Camada de Aplicação**: Services (`src/api/services`) encapsulam a lógica de negócio pura.
- **Camada de Interface**: Controllers (`src/api/controllers`) gerenciam entrada/saída HTTP.
- **Camada de Infraestrutura**: Configurações de banco (TypeORM), bibliotecas externas e adapters.

## 🚀 Tecnologias Chave

- **Node.js 22 + TypeScript 5.6**: Base sólida e tipada.
- **TypeORM + PostgreSQL**: Persistência de dados relacional com Migrations automáticas.
- **Express 5 + Helmet + RateLimit**: Segurança na camada HTTP.
- **Zod**: Validação rigorosa de inputs e variáveis de ambiente.
- **Winston**: Logging estruturado para observabilidade.
- **Jest**: Testes unitários e de integração.

## 🔒 Segurança

A aplicação implementa diversas camadas de defesa:
1. **Autenticação JWT** robusta.
2. **Sanitização de Input** contra XSS e SQL Injection.
3. **Rate Limiting** granular por endpoint (Auth, Public, Payment).
4. **Assinatura HMAC** para Webhooks (Mercado Pago).

## 🛠️ Comandos do Desenvolvedor

### Instalação
```bash
npm install
cp .env.example .env
```

### Execução
```bash
# Desenvolvimento (com Hot Reload)
npm run dev

# Produção (Build + Start + Migrations)
npm run build
npm start
```

### Banco de Dados
```bash
# Criar nova migration (após alterar entities)
npm run migration:generate --name=Descricao

# Rodar migrations (local)
npm run migration:run
```

### Testes e Qualidade
```bash
# Executar suíte de testes
npm test

# Linting e Formatação
npm run lint
npm run format
```

---

**Autor**: Anderson Santos
**Licença**: MIT
