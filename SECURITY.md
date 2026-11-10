# Política de Segurança

Projeto acadêmico. Não há garantia de que esteja livre de vulnerabilidades.

## Versões suportadas

| Versão | Suporte |
|--------|---------|
| 1.x (branch `main`) | Correções de segurança |

## Como reportar uma vulnerabilidade

Não abra uma issue pública. Use o **GitHub Private Vulnerability Reporting** (aba *Security* → *Report a vulnerability*) do repositório. Descreva o problema, os passos para reproduzir e o impacto. Como é um projeto acadêmico mantido por uma pessoa, a resposta é feita em melhor esforço (meta: confirmar o recebimento em até 7 dias).

## Controles implementados

- Todas as queries SQL são parametrizadas; as únicas partes dinâmicas do SQL são trechos fixos escritos no código.
- Entrada validada com `zod` (tipos, tamanhos, datas reais, ids decimais canônicos); corpo JSON limitado a 10 kB (resposta 413).
- Limite de requisições por IP (padrão 300/min, configurável em `RATE_LIMIT_MAX`).
- Cabeçalhos de segurança (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, CSP restritiva nas rotas da API) e `X-Powered-By` removido.
- Erros internos retornam mensagem genérica (sem stack trace na resposta).
- O servidor escuta por padrão apenas em `127.0.0.1` (`HOST` para alterar).
- `npm run seed` recusa rodar com `NODE_ENV=production`.

## Limitações conhecidas

- **Sem autenticação nem autorização:** qualquer cliente que alcance a API pode ler, criar e apagar todos os hábitos. É adequado para uso local/didático; não exponha na internet sem adicionar autenticação.
- **Rate limit por IP em memória:** não é compartilhado entre processos e, atrás de proxy reverso, exige configurar `trust proxy`.
- **Swagger UI em `/docs`** fica habilitado sempre e é servido sem CSP (a interface exige scripts inline).
- **Dados em texto livre** (`name`, `description`, `note`) são armazenados como recebidos. A API só responde JSON, mas clientes que os exibam como HTML devem escapá-los.
- **Dependências de desenvolvimento:** `npm audit` ainda reporta 5 avisos de severidade baixa na cadeia do `jest`, causados por `deepmerge` (prototype poisoning em `mergeObject`), que não tem versão corrigida publicada. Só afetam a execução dos testes, não o código de produção (`npm audit --omit=dev` retorna 0). As falhas de `minimatch` e `glob` foram corrigidas via `overrides` no `package.json`.
- Sem HTTPS próprio: use um proxy reverso com TLS se for publicar.

## Boas práticas ao contribuir

- Nunca versione `.env`, bancos `.db`, chaves ou arquivos de ferramentas de IA (já cobertos pelo `.gitignore`).
- Habilite o scan de segredos antes de commitar: `pip install pre-commit && pre-commit install` (config em `.pre-commit-config.yaml`).
