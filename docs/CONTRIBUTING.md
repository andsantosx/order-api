# Guia de Contribuição e Qualidade

> [!WARNING]
> **POLÍTICA DE SEGURANÇA**: É estritamente proibido o commit de arquivos `.env` ou qualquer forma de segredo (chaves de API, senhas, tokens) neste repositório.

---

## 1. Princípios de Engenharia

> **Integridade Obrigatória**: Toda alteração de código deve ser acompanhada dos respectivos testes (`unit` ou `integration`) e atualização da documentação técnica.

### Definição de "Pronto" (Definition of Done)
Uma tarefa só é considerada concluída quando:
1.  O código está implementado e funcional.
2.  Testes automatizados cobrem o caminho feliz e casos de erro.
3.  A documentação (`docs/`) reflete as mudanças.
4.  O código passa no linter e formatador sem erros.

## 2. Workflow de Desenvolvimento (SOP)

### Passo 1: Análise e Planejamento
- Identifique os cenários de uso (Caminho Feliz, Erros de Input, Erros de Negócio).
- Planeje a estrutura de dados e contratos de API.

### Passo 2: Implementação e Testes
- Utilize o ambiente Docker para garantir paridade com produção.
- **Testes de Integração** (`src/tests/integration`) são obrigatórios para novas features.
- Execute os testes frequentemente:
  ```bash
  docker exec -e DB_HOST=db order-api-app-1 npm test
  ```

### Passo 3: Documentação
- Atualize `docs/API.md` se houver mudanças em endpoints ou novos recursos.
- Atualize `docs/ARCHITECTURE.md` se houver mudanças estruturais ou novos serviços.
- Atualize `docs/SECURITY.md` se houver mudanças em segurança, autenticação ou rate limits.
- Atualize `docs/TESTING.md` se houver novos cenários de teste ou estratégias.
- Atualize `README.md` se houver mudanças em configuração ou setup.

### Passo 4: Verificação de Qualidade
- Linting: `npm run lint`
- Formatting: `npm run format`
- Build Check: `npm run build`

## 3. Componentes Críticos

### Pagamentos
- Todo status deve ser tratado (Approved, Pending, Rejected, Refunded).
- O sistema deve ser resiliente a falhas de webhook (idempotência).
- Webhooks devem retornar 200 OK rapidamente (< 1.5s).

### Segurança da Informação
- **PII (Dados Pessoais)**: Nunca logar dados sensíveis (senhas, tokens, CPF completo).
- **Validação**: Todo input deve passar por schemas Zod antes de processar.
- **Autenticação**: Rotas protegidas devem validar JWT explicitamente.
- **Auditoria**: Ações administrativas críticas devem ser registradas em AdminAuditLog.

### Emails Transacionais
- Sempre usar templates validados e testados.
- Incluir informações completas (breakdown de preços, customizações).
- Implementar fallback em caso de falha do serviço de email.

### Customização de Produtos
- Custo de customização (R$ 20,00) é fixo e definido em `constants/index.ts`.
- Customização deve ser salva no OrderItem, não no Order.
- Breakdown de preços deve separar subtotal, customização e frete.

### Comunicação em Tempo Real
- Socket.io requer autenticação JWT no handshake.
- Eventos devem ser emitidos para rooms específicas (user, order, admins).
- Nunca expor informações sensíveis em eventos socket.

## 4. Troubleshooting no Docker

Se encontrar erros de `unique constraint` em testes:
- O setup de testes executa `DROP SCHEMA public CASCADE` para garantir um estado limpo.
- Certifique-se de que o container do banco de testes (`order_db_test`) está saudável.
