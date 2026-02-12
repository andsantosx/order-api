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
- Atualize `docs/API.md` se houver mudanças em endpoints.
- Atualize `docs/ARCHITECTURE.md` se houver mudanças estruturais.
- Atualize `README.md` se houver mudanças em configuração.

### Passo 4: Verificação de Qualidade
- Linting: `npm run lint`
- Formatting: `npm run format`
- Build Check: `npm run build`

## 3. Componentes Críticos

### Pagamentos
- Todo status deve ser tratado (Approved, Pending, Rejected, Refunded).
- O sistema deve ser resiliente a falhas de webhook (idempotência).

### Segurança da Informação
- **PII (Dados Pessoais)**: Nunca logar dados sensíveis.
- **Validação**: Todo input deve passar por schemas Zod.
- **Autenticação**: Rotas protegidas devem validar JWT explicitamente.

## 4. Troubleshooting no Docker

Se encontrar erros de `unique constraint` em testes:
- O setup de testes executa `DROP SCHEMA public CASCADE` para garantir um estado limpo.
- Certifique-se de que o container do banco de testes (`order_db_test`) está saudável.
