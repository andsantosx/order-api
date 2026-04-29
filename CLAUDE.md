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
