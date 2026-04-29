# ☁️ Manual de Operações, Deploy e Infraestrutura

A Base desta Application Engine foi gerada inteiramente com foco na "Dockerização" e nuvem elástica, rodando `Node.js` através da velocidade assustadora das premissas de Server-Side. Segue a pauta de como orquestrar tanto a Máquina do Engenheiro Local quanto a Operação em Produção usando provedores como Railway, AWS, DigitalOcean e afins.

## 1. Tabela Matriz de Dependências Infracionais

| Componente Crítico | Requisito de Versão | Notas (Ambiente) |
|---|---|---|
| **Ambiente Nativo (Host)** | Node.js **22.x** | Alpine/LTS no Container |
| **Tecnologia Relacional** | **PostgreSQL 14.x** + | Utilizado as `Migrations` Tipo "Data-Source Native" no TypeORM |
| **Ecossistema Abstração Virtual** | Docker (20.x+) e Compose-Plugin | Para garantir ambientes perfeitamente espelhados de QA e PROD. |

> [!WARNING]
> Tenha cuidado com inconsistências. Como este repositório processa cálculos de pagamentos exatos e conversão criptográfica via Zod, não o reduza a versões defasadas de Node (<20.x) ou motores antiquados.

---

## 2. Injetores do Cofre Ambiente (Variáveis)

Um projeto Premium não hard-coda chaves. Configurar um arquivo local `.env` — e nunca o rastrear (`git`) — é mandatório para sobrevivência em open-source/mercado real.

**Obrigatórias no Host Cloud (Railway/AWS)**:
```bash
# PostgreSQL Host de Acesso
DB_HOST=NomeDoSeuContainerOulinkDoHost
DB_PORT=5432
DB_NAME=MinhaBaseVirtual
DB_USER=UsuarioSupremo
DB_PASSWORD='!!Minha_Senha_Secreta_Nao_Leitura!!'

# Camadas De Autenticadores
JWT_SECRET=UMACHAVEDEMINIMO64CARACTERESCRIPTOGRAFICAMENTEALOCADOS

# Motores Financeiros de Gateway Oculto
MERCADOPAGO_ACCESS_TOKEN=OndeATelaMagicaDeMPDisseSeuToken
MERCADOPAGO_WEBHOOK_SECRET=KeyQueImpedeHackersDeForjarSuasEntradasDePix

# Serviço de Email (Mailjet)
MAILJET_API_KEY=SuaChaveAPIDoMailjet
MAILJET_API_SECRET=SeuSecretDoMailjet
MAILJET_SENDER_EMAIL=noreply@seudominio.com
MAILJET_SENDER_NAME=SuaLoja

# Frontend URL (para CORS e links em emails)
FRONTEND_URL=https://seusite.com
```

---

## 3. Gestão Completa (Deploy via GitHub -> Railway Ecosystem)

Implementar essa infraestrutura no provedor em nuvem escalável "Railway" funciona excepcionalmente sem solavancos por causa do seu ambiente compilado pronto.

1. Registre o repósitorio no Servidor Nuvem (`New Project -> Deploy from Github Repo`).
2. Crie simultaneamente na nuvem do repositório um Plugin Base (*PostgreSQL Base*). Copie as variáveis dinâmicas (URL, Host, Senha).
3. Insira as variáveis coletadas dentro das "Environment variables do Server Web".
4. O servidor detectará a diretiva Build nativamente executando o `tsc --build` e rodando de imediato a aplicação pronta em `.dist/` na porta exigida.

> [!TIP]
> A Engine do App conta com rodapé inteligente de migrações nos Scripts do `package.json`. Ao mandar rodar e executar um boot de produção via script (`npm run start`), ela rodará também as diretivas pendentes de Migration (Garante banco populado perfeitamente) de forma paralela via CLI do TypeORM.

---

## 4. Workstations Isoladas (Ambiente Dev & Testes Livres Docker-Compose)

Para emular Localmente esse mesmo arsenal: O **Docker Compose** injetará o banco e levantará uma rede limpa. Para começar, construa as chaves num terminal usando um prompt.

1. **Primeiro Boot Mágico no Workspace:** Copie o template blindado e gere as credenciais da máquina.
```bash
cp .env.example .env
npm install
```

2. **Acionar o Motor de Bancos (`Up`) em background Daemon (`-d`):**
```bash
npm run docker:up
```

3. **Injetar O Sangue do App:** Subir a interface usando _Hot Recompilation (TypeScript Runner)_ que assiste nativamente seus arquivos para atualizar imediatamente:
```bash
npm run dev
# Sua API estará ressoando na porta Localhost referida em poucos segundos (geralmente localhost:3000)
```

4. **Banco Prontos e Mapeados em Transações Formais**:
Sincronizar a base crua recém forjada do Docker com todas as tabelas em segundos usando as migrations nativas escritas lá em `src/migrations/`:
```bash
npm run migration:run
npm run seed  # (Opcional - Adiciona Dummy Data do Catálogo de Loja Perfeito)
```

**Concluído!** — Todas as ferramentas administrativas embutidas encontram-se limpas. Seu backend flui incrivelmente bem como desenhado nos melhores tutoriais de Cloud Natives das indústrias TIER 1.

---

## 5. Configurações Adicionais para Produção

### Mailjet (Email Transacional)

O sistema envia emails automaticamente para:
- **Confirmação de Pedido**: Detalhes completos do pedido com breakdown de preços
- **Credenciais de Auto-signup**: Email e senha para usuários guest
- **Pedido Enviado**: Código de rastreio e estimativa de entrega
- **Verificação de Email**: Token de confirmação

Configure as seguintes variáveis:
```bash
MAILJET_API_KEY=sua-api-key
MAILJET_API_SECRET=seu-api-secret
MAILJET_SENDER_EMAIL=noreply@seudominio.com
MAILJET_SENDER_NAME=Nome da Sua Loja
```

### Socket.io (Comunicação em Tempo Real)

Para notificações instantâneas no frontend:
- Conecte-se em `wss://sua-api.com` (WebSocket)
- Inclua token JWT no header `Authorization` durante o handshake
- Eventos disponíveis: `orderStatusUpdate`, `paymentApproved`, etc.

### CORS e Segurança

Em produção, configure:
```bash
FRONTEND_URL=https://seusite.com  # URL exata do frontend
NODE_ENV=production
```

Isso garante:
- CORS restrito ao domínio exato do frontend
- Logs em formato JSON para agregadores
- Validações mais rigorosas
- Rate limits mais restritivos

### Migrations em Produção

As migrations são executadas automaticamente no comando `npm run start`:
```bash
"start": "npm run migration:run:prod && node dist/server.js"
```

Para executar manualmente:
```bash
npm run migration:run:prod
```

### Monitoramento de Saúde

Endpoint de health check disponível em `/api/health`:
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "mercadopago": "healthy",
    "mailjet": "healthy"
  }
}
```

Configure monitoramento (ex: UptimeRobot, Pingdom) para alertar se o serviço ficar offline.
