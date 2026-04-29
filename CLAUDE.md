# Instruções para Claude

## Idioma

Sempre responda e se comunique em Português (Brasil).

## ⚠️ SEGURANÇA CRÍTICA - REPOSITÓRIO PÚBLICO EM PRODUÇÃO

**ATENÇÃO MÁXIMA**: Este é um repositório **PÚBLICO** com aplicação **EM PRODUÇÃO**.

### NUNCA commitar ou salvar em arquivos:

❌ Senhas, tokens ou chaves de API reais
❌ Credenciais de banco de dados de produção
❌ JWT_SECRET de produção
❌ Tokens do Mercado Pago (access_token, webhook_secret)
❌ Credenciais do Mailjet (API key, API secret)
❌ IPs de servidores de produção
❌ URLs de bancos de dados de produção
❌ Dados pessoais de usuários reais (emails, CPFs, nomes, endereços)
❌ Dados de cartões de crédito (mesmo de teste)
❌ Logs contendo informações sensíveis
❌ Qualquer configuração que exponha infraestrutura real

### ✅ O que PODE ser documentado:

✅ Exemplos com dados fictícios (`user@example.com`, `12345678900`)
✅ Estrutura de configuração (sem valores reais)
✅ Nomes de variáveis de ambiente (sem os valores)
✅ Fluxos e arquitetura do sistema
✅ Exemplos de payloads com dados de teste
✅ Documentação de endpoints e APIs
✅ Padrões de código e boas práticas

### Antes de qualquer commit:

1. ✅ Verificar se não há dados sensíveis em NENHUM arquivo
2. ✅ Usar apenas dados de exemplo/placeholder
3. ✅ Confirmar que `.env` está no `.gitignore`
4. ✅ Revisar diff do commit antes de confirmar

### 🚨 Se dados sensíveis forem acidentalmente commitados:

**AÇÃO IMEDIATA NECESSÁRIA:**
1. **NÃO fazer push** se ainda não foi enviado
2. Remover o commit com dados sensíveis
3. **Trocar IMEDIATAMENTE** todas as credenciais expostas:
   - Gerar novo JWT_SECRET
   - Regenerar tokens do Mercado Pago
   - Regenerar chaves do Mailjet
   - Trocar senhas de banco de dados
4. Se já foi feito push: considerar o repositório comprometido e trocar TODAS as credenciais
5. Limpar histórico do git se necessário (git filter-branch ou BFG Repo-Cleaner)

**LEMBRE-SE**: Uma vez no histórico público do Git, considere os dados como permanentemente expostos.

---

## 🛡️ SEGURANÇA NO CÓDIGO - REPOSITÓRIO PÚBLICO

**CÓDIGO PÚBLICO = ATACANTES TÊM ACESSO TOTAL**

Como este repositório é público, atacantes podem:
- Ler todo o código-fonte
- Identificar vulnerabilidades
- Explorar falhas de segurança
- Estudar a lógica de negócio

### ❌ VULNERABILIDADES QUE NUNCA DEVEM EXISTIR NO CÓDIGO:

#### 1. Injection Attacks
- ❌ SQL Injection - SEMPRE usar TypeORM com queries parametrizadas
- ❌ NoSQL Injection - SEMPRE validar e sanitizar inputs
- ❌ Command Injection - NUNCA executar comandos shell com input do usuário
- ❌ Path Traversal - NUNCA usar input do usuário em caminhos de arquivo

#### 2. Autenticação e Autorização
- ❌ Endpoints sem autenticação que deveriam ter
- ❌ Verificação de autorização inadequada (sempre verificar se user.id === resource.userId)
- ❌ Tokens sem expiração ou com expiração muito longa
- ❌ Senhas armazenadas em texto plano (SEMPRE usar bcrypt)
- ❌ Algoritmos de hash fracos (MD5, SHA1)

#### 3. Validação de Dados
- ❌ Aceitar qualquer input sem validação (SEMPRE usar Zod schemas)
- ❌ Validação apenas no frontend (SEMPRE validar no backend)
- ❌ Não sanitizar HTML/Scripts (risco de XSS)
- ❌ Não validar tipos de arquivo em uploads
- ❌ Não limitar tamanho de requisições

#### 4. Exposição de Informações Sensíveis
- ❌ Stack traces detalhados em produção
- ❌ Mensagens de erro que revelam estrutura do sistema
- ❌ Comentários com informações confidenciais
- ❌ Logs com dados sensíveis (senhas, tokens, CPF completo)
- ❌ Endpoints que retornam dados de outros usuários sem verificação

#### 5. Lógica de Negócio Insegura
- ❌ Permitir valores negativos onde não deveria (preços, quantidades)
- ❌ Não verificar limites (max items per order, max order value)
- ❌ Race conditions em operações críticas (pagamentos, estoque)
- ❌ Falta de idempotência em operações financeiras
- ❌ Permitir ações em recursos de outros usuários

#### 6. Rate Limiting e DoS
- ❌ Endpoints sem rate limiting
- ❌ Rate limits muito permissivos
- ❌ Não limitar tamanho de arrays/objetos em requisições
- ❌ Operações caras sem proteção (queries complexas, uploads)

#### 7. Dependências e Código Terceiro
- ❌ Dependências com vulnerabilidades conhecidas (npm audit)
- ❌ Usar pacotes sem verificar confiabilidade
- ❌ Não atualizar dependências críticas de segurança

### ✅ BOAS PRÁTICAS OBRIGATÓRIAS:

#### Antes de Commitar QUALQUER Código:

1. **Validação de Input**
   ```typescript
   // ✅ SEMPRE fazer
   const data = createOrderSchema.parse(req.body);
   
   // ❌ NUNCA fazer
   const data = req.body; // Sem validação
   ```

2. **Autenticação**
   ```typescript
   // ✅ SEMPRE verificar
   if (!req.user) throw new AppError('Não autenticado', 401);
   
   // ✅ SEMPRE verificar propriedade
   if (order.user_id !== req.user.id && !req.user.isAdmin) {
     throw new AppError('Não autorizado', 403);
   }
   ```

3. **Sanitização**
   ```typescript
   // ✅ SEMPRE sanitizar dados de texto
   const sanitizedData = sanitizeUserData(userData);
   
   // ✅ SEMPRE validar URLs de imagem
   if (!isValidImageUrl(imageUrl)) {
     throw new AppError('URL de imagem inválida', 400);
   }
   ```

4. **Queries de Banco**
   ```typescript
   // ✅ SEMPRE usar parametrizado
   await orderRepository.find({ where: { user_id: userId } });
   
   // ❌ NUNCA fazer interpolação direta
   await db.query(`SELECT * FROM orders WHERE user_id = '${userId}'`);
   ```

5. **Logs Seguros**
   ```typescript
   // ✅ PODE logar
   log.info('Pedido criado', { orderId, userId, totalCents });
   
   // ❌ NUNCA logar
   log.info('Login', { email, password }); // Senha!
   log.info('Token gerado', { token }); // Token!
   ```

### 🔍 Checklist de Segurança Antes de Commit:

- [ ] Todo input de usuário é validado com Zod
- [ ] Todos os dados de texto são sanitizados (stripHtml)
- [ ] Endpoints protegidos têm authMiddleware
- [ ] Verificação de propriedade (user.id === resource.userId)
- [ ] Queries usam parametrização (TypeORM)
- [ ] Rate limiting aplicado em endpoints sensíveis
- [ ] Nenhum dado sensível em logs
- [ ] Mensagens de erro não revelam estrutura interna
- [ ] Valores monetários em centavos (nunca float)
- [ ] Limites aplicados (max items, max value, max length)
- [ ] `npm audit` sem vulnerabilidades críticas
- [ ] Nenhum comentário com informações confidenciais
- [ ] Nenhum código debug/desenvolvimento (console.log)
- [ ] Transações em operações críticas (pedidos, pagamentos)

### 🚨 Exemplos de Código INSEGURO (NUNCA FAZER):

```typescript
// ❌ SQL Injection
await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// ❌ XSS - Não sanitizar
user.name = req.body.name; // Pode conter <script>

// ❌ Falta de autorização
app.get('/orders/:id', async (req, res) => {
  const order = await getOrder(req.params.id);
  return res.json(order); // Qualquer um pode ver qualquer pedido!
});

// ❌ Senhas em plain text
user.password = req.body.password; // SEM bcrypt!

// ❌ Token sem expiração
jwt.sign({ userId }, secret); // SEM expiresIn!

// ❌ Dados sensíveis no log
log.info('User login', { email, password, token });

// ❌ Erro revelando estrutura
catch (error) {
  res.json({ error: error.stack }); // Expõe estrutura interna!
}

// ❌ Sem rate limit em endpoint crítico
app.post('/auth/login', loginController); // Brute force!

// ❌ Sem validação
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body); // Aceita QUALQUER coisa!
});
```

### 📋 Revisão de Código Focada em Segurança:

Ao revisar PRs ou código próprio, pergunte:

1. **Este endpoint precisa de autenticação?** Se sim, tem authMiddleware?
2. **Este endpoint precisa de autorização?** Verifica se o usuário é dono do recurso?
3. **Este input é validado?** Tem Zod schema?
4. **Este input é sanitizado?** Tem stripHtml ou validação de URL?
5. **Esta query está segura?** Usa TypeORM parametrizado?
6. **Este endpoint tem rate limiting?** Se é sensível, tem proteção?
7. **Este log é seguro?** Não contém senhas/tokens/dados sensíveis?
8. **Este erro é seguro?** Não revela estrutura interna em produção?
9. **Esta operação precisa de transação?** Se envolve múltiplas tabelas, usa transaction?
10. **Esta operação tem limites?** Valida max/min values?

---

## Documentação e Padrões

**OBRIGATÓRIO**: Sempre consulte e utilize os documentos em `/docs` para:

- **Seguir padrões de segurança** definidos em `docs/SECURITY.md`
- **Respeitar a arquitetura** descrita em `docs/ARCHITECTURE.md`
- **Aplicar boas práticas** de código documentadas
- **Manter consistência** com os padrões estabelecidos

**IMPORTANTE**: Sempre que fizer alterações no código:

1. **Atualize a documentação** relevante em `/docs` para refletir as mudanças
2. **Verifique se os padrões** definidos estão sendo seguidos
3. **Mantenha os documentos sincronizados** com o estado atual do projeto

Os documentos em `/docs` são a fonte da verdade para padrões, arquitetura e boas práticas deste projeto.
