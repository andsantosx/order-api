# Guia de Testes e Estratégia de Manutenção

> [!IMPORTANT]
> **DADOS DE TESTE**: Use exclusivamente dados fictícios e bancos de dados isolados (`order_db_test`) para a execução de suítes de teste.

---

## 1. Filosofia de Testes
O objetivo é **100% de funcionalidade** e **confiabilidade**. Cada funcionalidade deve ser testada contra:
- **Caminhos Felizes (Happy Paths)**: O fluxo padrão de sucesso (ex: pagamento aprovado, pedido criado).
- **Casos de Borda (Edge Cases)**: Cenários incomuns mas possíveis (ex: inputs inesperados, valores limites).
- **Tratamento de Erros**: Comportamento do sistema quando algo dá errado (ex: rejeição de pagamento, IDs inválidos, conflito).
- **Experiência do Usuário (UX)**: Garantir que o backend responde de forma graciosa (ex: mensagens de erro claras).

### Protocolo de Manutenção
> **Consulte o [Protocolo Completo](CONTRIBUTING.md)** para detalhes sobre o workflow obrigatório.
> **Regra Crítica**: Sempre que o código for modificado, o seguinte **DEVE** acontecer:
> 1.  **Atualizar Testes**: Ajustar testes existentes ou adicionar novos para cobrir as mudanças.
> 2.  **Verificar Todos os Cenários**: Rodar a suíte completa de testes para garantir que não houve regressão.
> 3.  **Atualizar Documentação**: Refletir mudanças no `walkthrough.md` e neste documento.

---

## 2. Suítes de Testes Existentes

### A. Integração de Pagamentos e Pedidos (`src/tests/integration/payment_scenarios.test.ts` e `payment.test.ts`)
Estas suítes cobrem os fluxos financeiros críticos e o ciclo de vida do pedido. `payment_scenarios.test.ts` foca em fluxos de negócios complexos, enquanto `payment.test.ts` foca na integridade da API de pagamento.

| Cenário | Descrição | Tipo de Cobertura |
| :--- | :--- | :--- |
| **Pagamento Auth** | Usuário logado cria pedido e paga com sucesso. | Caminho Feliz |
| **Pagamento Guest** | Visitante cria pedido (criação automática de conta) e paga com sucesso. | Caminho Feliz / UX |
| **Webhook** | Simula webhook do Mercado Pago para atualizar status (ex: `in_process` -> `approved`). | Integração |
| **Rejeição** | Simula cartão recusado; verifica se status do pedido vira `CANCELED`. | Tratamento de Erro |
| **Pendente** | Simula pagamento pendente (ex: boleto); verifica se pedido continua `PENDING`. | Caso de Borda |
| **Reembolso** | Admin estorna pedido pago; verifica status `REFUNDED`. | Admin / Caminho Feliz |
| **Cancelamento** | Usuário cancela pedido pendente; verifica status `CANCELED`. | Ação do Usuário |

### B. Integração de Usuários (`src/tests/integration/auth.test.ts`)
Valida o ciclo de registro, login e proteção de rotas.

| Cenário | Descrição | Tipo de Cobertura |
| :--- | :--- | :--- |
| **Registro** | Criação de novo usuário com dados válidos. | Caminho Feliz |
| **Login** | Autenticação com e-mail e senha. | Caminho Feliz |
| **Credenciais Inválidas** | Tentativa de login com senha incorreta. | Segurança |

### C. Validação de Pedidos (`src/tests/integration/order.test.ts`)
Esta suíte foca na integridade estrutural da criação do pedido.

| Cenário | Descrição | Tipo de Cobertura |
| :--- | :--- | :--- |
| **Criação de Pedido** | Valida estrutura correta do payload, sanitização de endereço e armazenamento no DB. | Caminho Feliz |
| **Suporte a Size ID** | **[NOVO]** Verifica se IDs numéricos de Tamanho (ex: `1`) são aceitos e armazenados corretamente como nomes (ex: "P"). | Feature / UX |
| **Produto Inválido** | Tenta pedir produto inexistente; espera 404. | Tratamento de Erro |
| **Integridade de Dados** | Verifica cálculo de `total_amount` e status padrão (`PENDING`). | Lógica |

---

## 3. Configurações Chave para Testes
- **Banco de Dados**: Usa um banco **PostgreSQL** dedicado e isolado (`order_db_test`) rodando dentro do Docker. A isolação via banco separado previne erros de `pg_type` (unique constraint violations) que ocorrem ao tentar sincronizar o esquema enquanto o servidor de dev está ativo.
- **Mocks**:
  - `Mercado Pago`: Simulado para evitar necessidade de chaves reais e chamadas de rede.
  - `AppDataSource`: Mockado nos testes para forçar o uso do `TestDataSource` (conectado ao banco de testes isolado).
- **Ambiente**: `NODE_ENV=test` garante que o esquema seja sincronizado (`synchronize: true`) no banco de testes ao iniciar.


## 4. Como Rodar os Testes
Para garantir que os testes rodem no ambiente correto, use o Docker:

```bash
docker exec -e DB_HOST=db order-api-app-1 npm test
```

Para rodar uma suíte específica (ex: cenários de pagamento):
```bash
docker exec -e DB_HOST=db order-api-app-1 npx jest src/tests/integration/payment_scenarios.test.ts --verbose
```

## 5. Considerações Futuras (A Implementar)
Para atingir uma cobertura verdadeiramente abrangente, as seguintes áreas devem ser monitoradas e testadas conforme novas funcionalidades forem adicionadas:

- **Gestão de Estoque**: Atualmente, o sistema **não** rastreia níveis de estoque por tamanho/variante. Implementar uma entidade `Variant` ou checagem de estoque antes da criação do pedido é um próximo passo crítico.
- **Concorrência**: Garantir prevenção de pagamento duplo (idempotência é atualmente mockada/verificada).
- **Limites do Usuário**: Máximo de pedidos abertos, valor máximo por pedido.

## 6. Troubleshooting

### Erro: `duplicate key value violates unique constraint "pg_type_typname_nsp_index"`
Este erro ocorre no PostgreSQL quando o TypeORM tenta criar um `ENUM` que já existe globalmente no banco. 

**Solução**: O projeto utiliza um reset radical no arquivo `src/tests/setup.ts` via `DROP SCHEMA public CASCADE`.

### Erro: `function uuid_generate_v4() does not exist`
Ocorre se a extensão `uuid-ossp` for removida (ex: pelo comando `CASCADE`) e não for recriada.
**Solução**: Verifique se o `setup.ts` inclui o comando `CREATE EXTENSION` logo após recriar o schema `public`.
