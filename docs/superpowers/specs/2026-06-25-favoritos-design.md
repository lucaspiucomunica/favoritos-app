# Favoritos — Webapp pessoal para salvar e organizar links

**Data:** 2026-06-25
**Status:** Spec aprovado (design) — aguardando revisão final antes do plano de implementação
**Autor:** Lucas (lucas@piucomunica.com.br)

## Problema

Links hoje ficam espalhados em grupo do WhatsApp e nos salvos do Instagram. Nada
centralizado, organizado, com boa busca e boa interface.

## Objetivo

Um webapp pessoal onde o usuário cola uma URL e ela é salva e classificada
automaticamente (categoria + tags) por IA, com possibilidade de corrigir a
classificação manualmente.

## Usuário e escopo

- **Single-user.** Apenas o autor usa.
- Sem sistema de múltiplos usuários, sem cadastro, sem perfis.
- Autenticação apenas para proteger o acesso (senha única via env var).

## Stack

- **Front + back:** Next.js (App Router), hospedado na Vercel (free tier).
- **Banco:** Neon (Postgres serverless). Ver justificativa abaixo.
- **LLM:** DeepSeek via API compatível com OpenAI.
  - Base URL: `https://api.deepseek.com`
  - Modelo: `deepseek-v4-flash` (modo **não-thinking**, saída JSON)
  - **NÃO usar** `deepseek-chat` nem `deepseek-reasoner` (descontinuados em 24/07/2026)
  - Key em variável de ambiente, **nunca exposta no front**. Chamada feita só em
    route handler / serverless function.
- **Sem n8n.** Classificação é chamada direta da route handler à API da DeepSeek.

## 1. Decisão de banco: Neon (não Supabase)

Critério prioritário do usuário: **não cair quando fica sem uso e voltar sem
intervenção manual.** É exatamente onde os dois divergem (verificado em 2026):

| | **Neon** (escolhido) | Supabase |
|---|---|---|
| Inatividade | Suspende em 5 min | Pausa após 7 dias sem atividade no banco |
| Retorno | **Automático** na 1ª requisição (~300–800ms, p99 ~500ms) | **Manual** no dashboard (ou cron de keep-alive) |
| Risco ao requisito principal | Nenhum | Fica indisponível até despausar manualmente |
| Auth | Não necessária (senha via env) | Traria Auth, mas é complexidade indesejada aqui |

Como a auth escolhida é senha via env var, o diferencial do Supabase (Auth pronta)
não agrega valor, enquanto seu comportamento de pausa é risco direto ao requisito
nº 1. **Decisão: Neon.** Driver: `@neondatabase/serverless` (HTTP, adequado a
ambientes serverless).

Referências:
- Supabase pausing: https://supabase.com/docs/guides/troubleshooting/pausing-pro-projects-vNL-2a
- Neon scale-to-zero: https://neon.com/docs/introduction/scale-to-zero

## 2. Modelo de dados

Deliberadamente enxuto (single-user, MVP).

### Tabela `categories` — lista fixa, mas extensível

| campo | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | UNIQUE, NOT NULL |
| `created_at` | timestamptz | default now() |

**Seed inicial:** Receitas, Artigos, Notícias, Vídeos, Ferramentas, Tech/Dev, IA,
UI/Design, Inspiração, Educação, Finanças, Saúde.

O usuário pode criar novas categorias pela UI. A IA escolhe **apenas** dentre as
categorias existentes naquele momento — nunca inventa.

### Tabela `links`

| campo | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `url` | text | NOT NULL |
| `title` | text | de Open Graph / `<title>` |
| `description` | text | de OG / `<meta description>` |
| `image_url` | text | de `og:image` |
| `site_name` | text | de `og:site_name` |
| `category_id` | uuid FK → categories | **nullable**; null = "Sem categoria" |
| `tags` | text[] | DEFAULT '{}', índice GIN para filtro |
| `is_read` | boolean | DEFAULT false |
| `is_favorite` | boolean | DEFAULT false |
| `ai_status` | text | 'done' \| 'failed' (no MVP, síncrono). 'pending' reservado p/ eventual fluxo assíncrono |
| `ai_error` | text | nullable, mensagem do erro de classificação |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | atualizado em edições |

**Decisões de modelagem:**
- Categoria: 1 por link, da lista fixa-extensível. `null` representa "Sem categoria"
  (sem linha mágica na tabela).
- Tags: várias por link, livres (geradas pela IA), armazenadas como `text[]` no
  próprio link — mais simples que tabela normalizada e suficiente para single-user.
  Lista de tags para o filtro sai de query sobre o array. Tabela normalizada de tags
  (com rename/merge) fica para v2 se a manutenção exigir.

## 3. Fluxo de classificação

Endpoint: `POST /api/links` (body `{ url }`). Execução **síncrona** dentro do
handler, com `maxDuration` configurado. Princípio central: **o link nunca se perde**,
mesmo se a IA ou o fetch falharem.

1. **Normaliza** a URL recebida.
2. **Busca metadados (Open Graph):** `fetch` do HTML com `AbortController`
   (~6s de timeout). Parse de `og:title`, `og:description`, `og:image`,
   `og:site_name`, com fallback para `<title>` e `<meta name="description">`.
3. **Monta o prompt** injetando a lista atual de categorias e as tags já existentes
   (para reaproveitamento).
4. **Chama a DeepSeek** via SDK da OpenAI apontado para `https://api.deepseek.com`:
   - modelo `deepseek-v4-flash` (não-thinking)
   - `response_format: { type: 'json_object' }`
   - `temperature: 0.2`
   - `AbortController` com timeout próprio
5. **Valida o JSON com Zod:** formato `{ category: string, tags: string[] }`.
   - Se `category` não estiver na lista de categorias → coage para `null`
     ("Sem categoria").
   - Tags: minúsculas, sem duplicatas, no máximo 5.
6. **Salva** o link com `ai_status='done'`.
7. **Tratamento de erro** (OG falhou, DeepSeek deu timeout/erro, ou JSON inválido):
   salva mesmo assim com os metadados que conseguiu obter, `category_id=null`,
   `ai_status='failed'` e `ai_error` preenchido.

**Reclassificar:** `POST /api/links/:id/reclassify` refaz apenas o passo de IA
(passos 3–6) sobre um link já existente.

## 4. Prompt de classificação

```
SYSTEM:
Você classifica links salvos por um usuário. Responda SOMENTE com JSON válido.
Escolha a categoria EXCLUSIVAMENTE da lista fornecida — nunca invente categorias.
Se nenhuma encaixar bem, use "Sem categoria".

USER:
Categorias disponíveis: [Receitas, Artigos, Notícias, Vídeos, Ferramentas,
Tech/Dev, IA, UI/Design, Inspiração, Educação, Finanças, Saúde, Sem categoria]

Tags já existentes (reutilize quando fizer sentido): [<lista atual>]

Link:
- URL: <url>
- Título: <título OG>
- Descrição: <descrição OG>

Retorne JSON no formato exato:
{ "category": "<uma das categorias>", "tags": ["tag1", "tag2", "tag3"] }

Regras: 1 categoria; 3 a 5 tags curtas em minúsculas, em português, específicas
ao conteúdo (não genéricas como "link" ou "internet").
```

A lista de categorias e as tags existentes são injetadas dinamicamente a cada
chamada, refletindo o estado atual do banco.

## 5. Autenticação

- **Senha única** guardada em variável de ambiente.
- Login simples → cookie de sessão **assinado**.
- Middleware do Next.js protege todas as rotas (UI e API) exceto a tela de login.
- Sem registro, sem recuperação de senha, sem múltiplos usuários.

## 6. Requisitos funcionais — MVP

- Adicionar link colando a URL → extração de OG + classificação automática por IA.
- Salvar categoria + tags no banco.
- Editar/corrigir categoria e tags manualmente.
- Criar categoria nova manualmente.
- Listar, buscar (título/descrição/url) e filtrar por categoria e por tag.
- Marcar como lido / favorito.
- Excluir link.
- Reclassificar (retry da IA) em links com `ai_status='failed'` ou quando desejado.

## 7. Design da interface

Construída com apoio do plugin **frontend-design**. Boa experiência e visual que não
pareça template genérico são parte central do objetivo — escolhas deliberadas de
paleta, tipografia e um elemento de assinatura. Detalhamento visual ocorre na fase de
implementação da UI.

## 8. Fora de escopo — v2 (registrado, não construído agora)

Itens conscientemente adiados. Ficam documentados aqui para retomada futura com
contexto:

- **Importação em massa:** export do WhatsApp / salvos do Instagram.
- **Captura rápida:** PWA / share target / extensão de navegador para salvar com 1
  toque a partir do celular.
- **Tags normalizadas:** tabela própria com rename/merge/limpeza, caso o `text[]`
  vire bagunça.
- **IA sugerindo categoria nova** com confirmação do usuário (no MVP a IA só escolhe
  da lista existente; criação é 100% manual).
- **Busca semântica** e ranking de relevância (full-text).
- **Detecção de link morto**, arquivamento / screenshot da página.
- **Coleções / múltiplas listas.**

## Custo esperado

~zero em repouso (Vercel serverless + Neon escala a zero). Centavos por mês de uso da
DeepSeek.

## Premissas e restrições

- Vercel free tier: atenção ao limite de `maxDuration` da função; OG fetch + 1 chamada
  DeepSeek devem caber confortavelmente.
- Neon free tier: cold start de centenas de ms é aceitável para uso pessoal.
- DeepSeek key e Neon connection string são segredos, só em env vars no servidor.
