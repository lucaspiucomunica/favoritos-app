# Favoritos — Setup, rodar localmente e deploy

Este é o checklist que exige **suas credenciais** (Neon + DeepSeek) e sua conta
Vercel. O código está completo e os testes unitários passam; estes passos ligam o
app ao banco e à IA e o colocam no ar.

## 0. Variáveis de ambiente

O app usa 4 segredos (ver `.env.example`):

| Var | O que é |
|---|---|
| `DATABASE_URL` | Connection string da sua branch Neon (Postgres). |
| `DEEPSEEK_API_KEY` | Chave da API DeepSeek. |
| `APP_PASSWORD` | A senha única para entrar no app. |
| `SESSION_SECRET` | String aleatória longa para assinar o cookie de sessão. |

Gere um `SESSION_SECRET` forte, por exemplo (cole no terminal com `!`):

```
! node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 1. Criar o banco no Neon

1. Crie um projeto em https://neon.com (free tier — escala a zero e volta sozinho).
2. Copie a connection string (pooled) — algo como
   `postgresql://USER:PASS@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.
3. Coloque em `.env.local` como `DATABASE_URL=...`.

## 2. Pegar a chave da DeepSeek

1. Crie uma key em https://platform.deepseek.com.
2. `DEEPSEEK_API_KEY=...` no `.env.local`.
3. O modelo usado é `deepseek-v4-flash` (não-thinking, JSON). Não troque para
   `deepseek-chat`/`deepseek-reasoner` — serão descontinuados em 24/07/2026.

## 3. Criar `.env.local`

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
DEEPSEEK_API_KEY=sk-...
APP_PASSWORD=escolha-uma-senha
SESSION_SECRET=<saída do comando do passo 0>
```

## 4. Rodar a migração (cria tabelas + seed das 12 categorias)

```
! npm run migrate
```
Esperado: `Migração aplicada: N statements.` Confira no console Neon que a tabela
`categories` tem 12 linhas e que `links` existe.

## 5. Rodar localmente

```
! npm run dev
```
Abra http://localhost:3000 → redireciona para `/login`. Entre com `APP_PASSWORD`.
(O cookie é `secure` só em produção, então funciona em `http://localhost`.)

Teste o fluxo do MVP:
- Cole uma URL → o card aparece classificado (categoria + tags) em alguns segundos.
- Edite categoria/tags; crie uma categoria nova no diálogo de edição.
- Busque, filtre por categoria e por tag (clique numa tag do card).
- Favorite (a fita coral), marque como lido, exclua.
- Force uma falha (URL de domínio inexistente) e use **Reclassificar**.

## 6. Deploy na Vercel

1. Suba o repositório para o GitHub e importe na Vercel (framework Next.js,
   detecção automática).
2. Em **Settings → Environment Variables** (Production + Preview), adicione as 4
   vars do passo 3. **Nunca** commite `.env.local`.
3. Rode a migração contra o banco de produção uma vez (com a `DATABASE_URL` de
   produção em `.env.local` temporariamente): `! npm run migrate`.
4. Deploy. Acesse a URL → `/login` → entre → adicione um link real e confirme a
   classificação e a persistência.

### Notas
- Imagens de preview (`og:image`) usam `<img>` nativo (sem otimização do Next), o
  que aceita qualquer domínio sem configuração. Se um dia trocar para `next/image`,
  configure `images.remotePatterns` em `next.config.ts`.
- `maxDuration = 30` nas rotas que classificam. O free tier da Vercel cobre o
  fluxo (OG ~6s + DeepSeek ~20s). Se o seu plano impuser limite menor, ajuste.
- Custo em repouso ~zero: Vercel serverless + Neon escala a zero; gasto só de
  centavos da DeepSeek por uso.

## Itens conhecidos (registrados, fora do MVP)
- `DELETE /api/auth` (logout) não exige sessão válida — inofensivo (no-op) para
  single-user; endurecer se algum dia virar multiusuário.
- v2 documentado no spec: importação em massa (WhatsApp/Instagram), PWA/share
  target, tags normalizadas com merge, busca semântica, detecção de link morto.
  Ver `docs/superpowers/specs/2026-06-25-favoritos-design.md`.
