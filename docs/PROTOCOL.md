# Protocolo de Manutenção e Qualidade

Este documento define as regras **OBRIGATÓRIAS** para qualquer alteração neste projeto. O objetivo é garantir que a plataforma permaneça 100% funcional, segura e atualizada.

## ⚠️ Regra de Ouro (The Golden Rule)

> **"Se você alterou o código, você DEVE atualizar os testes e a documentação."**

Não existem exceções. Funcionalidades sem testes ou documentação desatualizada são consideradas **código quebrado**.

---

## Workflow de Desenvolvimento (Passo a Passo)

Para qualquer tarefa (seja correção de bug, nova feature ou refatoração), siga este ciclo:

### 1. Análise e Planejamento
- Antes de codar, pense: "Quais são todas as opções que o usuário tem aqui?"
- Considere:
    - **Caminho Feliz**: O usuário faz tudo certo.
    - **Erros de Input**: O usuário envia dados inválidos (ex: texto em campo de número).
    - **Erros de Negócio**: O usuário tenta comprar sem saldo, etc.
    - **Erros de Sistema**: O banco cai, a API de pagamento falha.

### 2. Implementação e Testes (Ambiente Docker)
- Altere o código.
- **Imediatamente** atualize ou crie testes em `src/tests/integration`.
- **Rode os testes no Docker** para garantir consistência total:
    - Geral: `docker exec -e DB_HOST=db order-api-app-1 npm test`
- **Estabilidade do Banco**: Para evitar erros de `duplicate key` em ENUMs do Postgres, o projeto usa um reset radical (`DROP SCHEMA public CASCADE`) no setup dos testes. Isso é obrigatório para manter a paridade.
- **Verifique Pagamentos e Pedidos**: Estas são as áreas mais críticas.
    - Se mexeu em Pedidos: Rode `...npm test src/tests/integration/order.test.ts`
    - Se mexeu em Pagamentos: Rode `...npm test src/tests/integration/payment_scenarios.test.ts`
- Garanta que TODOS os testes passem.
- **Qualidade de Código**: Rode `npm run lint` e `npm run format` dentro do container para evitar disparidades de ambiente.

### 3. Documentação
- Após os testes passarem, atualize:
    - `docs/API.md` (se mudou rotas/schemas).
    - `docs/TESTING.md` (se adicionou novos cenários de teste).
    - `docs/ARCHITECTURE.md` (se mudou a estrutura do projeto).

### 4. Verificação Final (Checklist de 100% Funcional)
Antes de dar a tarefa como concluída, pergunte-se:
- [ ] O usuário consegue realizar a ação principal sem erros?
- [ ] O sistema trata erros de forma amigável se o usuário errar?
- [ ] Os dados estão sendo salvos corretamente no banco (ex: **Size ID** numérico é aceito e traduzido para Nome)?
- [ ] A documentação reflete EXATAMENTE o que o código faz agora?
- [ ] **Rodei os testes e lint dentro do Docker?** (Crucial para paridade)


---

## Áreas Críticas (Atenção Redobrada)

### 💳 Pagamentos
- Todas as opções devem ser tratadas: Sucesso, Falha, Pendente, Cancelado, Estornado.
- O sistema nunca deve deixar um pedido em status inconsistente. (Ex: Pago mas com status Pendente).

### 📦 Pedidos
- Validar endereços e propriedade do pedido.
- Garantir que o usuário só vê o que é dele.

### 🛡️ Segurança
- Nunca expor dados sensíveis.
- Sempre validar inputs com Zod (`src/api/schemas`).

---

**Este protocolo garante que o projeto evolua sem quebrar funcionalidades antigas e mantendo a qualidade máxima para o usuário final.**
