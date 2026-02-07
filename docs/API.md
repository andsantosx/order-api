# Documentação da API

A documentação da API é gerada automaticamente via **Swagger/OpenAPI**.

## Acessando a Documentação

1. **Inicie o servidor**:

   ```bash
   npm run dev
   # ou
   npm run docker:up
   ```

2. **Acesse no navegador**:
   [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## Recursos Disponíveis no Swagger

- **Exploração de Rotas**: Visualização de todos os endpoints disponíveis.
- **Schemas**: Detalhes dos modelos de dados (Request/Response bodies).
- **Testes Interativos**: Possibilidade de fazer requisições diretamente pelo navegador.
- **Autenticação**: Botão `Authorize` para inserir o token JWT e testar rotas protegidas.

## Estrutura da API

A API segue os princípios REST e utiliza JSON para comunicação.

### Status Codes Comuns

- `200 OK`: Sucesso.
- `201 Created`: Recurso criado com sucesso.
- `400 Bad Request`: Erro de validação ou requisição inválida.
- `401 Unauthorized`: Token ausente ou inválido.
- `403 Forbidden`: Token válido, mas sem permissão (ex: não é admin).
- `404 Not Found`: Recurso não encontrado.
- `429 Too Many Requests`: Limite de requisições excedido.
- `500 Internal Server Error`: Erro inesperado no servidor.
