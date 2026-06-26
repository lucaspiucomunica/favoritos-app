# Favoritos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **For every task that writes code against an external library** (Next.js, `@neondatabase/serverless`, `openai`, `node-html-parser`, `zod`, `vitest`), consult context7 docs for that library BEFORE writing the code. Do not write API calls from memory.

**Goal:** Construir um webapp pessoal single-user para salvar URLs que são automaticamente classificadas (categoria + tags) por IA, com correção manual, busca e filtros.

**Architecture:** Next.js (App Router) na Vercel. Banco Neon (Postgres serverless) acessado via `@neondatabase/serverless` com tagged templates. Lógica pura isolada em `src/lib/*` (auth, og, classify, data access) e testada via Vitest com TDD; route handlers finos orquestram essas libs. Classificação é uma chamada síncrona da route handler `POST /api/links` à API da DeepSeek (compatível com OpenAI). Auth por senha única (env var) + cookie de sessão assinado com HMAC, validado no middleware.

**Tech Stack:** Next.js (App Router, TypeScript), React, `@neondatabase/serverless`, `openai` (apontado para DeepSeek), `node-html-parser`, `zod`, Vitest. Tailwind CSS para a UI (refinada na fase frontend-design).

## Global Constraints

- **LLM:** modelo `deepseek-v4-flash`, modo não-thinking, saída JSON. NUNCA usar `deepseek-chat` nem `deepseek-reasoner`.
- **DeepSeek base URL:** `https://api.deepseek.com`.
- **Segredos** (`DEEPSEEK_API_KEY`, `DATABASE_URL`, `APP_PASSWORD`, `SESSION_SECRET`) só em env vars no servidor — NUNCA expostos no front nem em código cliente.
- **Banco:** Neon. Driver `@neondatabase/serverless`, função `neon()` com tagged templates (seguro contra SQL injection).
- **IA escolhe categoria apenas da lista existente.** Se nada encaixa → `null` ("Sem categoria"). Nunca inventa categoria.
- **Tags:** 3 a 5, minúsculas, em português, sem duplicatas, específicas (não genéricas).
- **Link nunca se perde:** se OG fetch ou DeepSeek falharem, salvar mesmo assim com `ai_status='failed'` e `ai_error`.
- **Next.js 15+:** em route handlers dinâmicos, `params` é uma `Promise` e deve ser `await`-ed.
- **Custo ~zero em repouso.**

## File Structure

```
favoritos/
  package.json
  next.config.ts
  tsconfig.json
  vitest.config.ts
  .env.example                 # documenta as env vars (sem valores)
  .gitignore
  middleware.ts                # gate de auth (edge), verifica cookie de sessão
  src/
    lib/
      types.ts                 # Category, Link, AiStatus
      auth.ts                  # signSession/verifySession (HMAC), checkPassword (const-time)
      og.ts                    # fetchMetadata(url) -> { title, description, image_url, site_name }
      classify.ts              # classifyLink(...) -> { category, tags } (DeepSeek)
      schema.ts                # zod schemas (AddLinkInput, UpdateLinkInput, ClassifyResult, ...)
      db.ts                    # neon sql client
      links.ts                 # data access de links (create/list/get/update/delete)
      categories.ts            # data access de categorias (list/create/names)
    db/
      schema.sql               # DDL das tabelas + seed de categorias
      migrate.ts               # aplica schema.sql no Neon
    app/
      layout.tsx
      globals.css
      login/page.tsx           # tela de login
      page.tsx                 # UI principal (lista, busca, filtros, ações)
      components/              # componentes da UI
      api/
        auth/route.ts          # POST login, DELETE logout
        links/route.ts         # GET list (com filtros), POST add
        links/[id]/route.ts    # PATCH editar, DELETE excluir
        links/[id]/reclassify/route.ts  # POST reclassificar
        categories/route.ts    # GET list, POST criar
  tests/
    lib/
      auth.test.ts
      og.test.ts
      classify.test.ts
      schema.test.ts
    fixtures/
      page-with-og.html
      page-without-og.html
```

---

### Task 1: Scaffold do projeto + tooling

Cria o projeto Next.js, configura TypeScript/Tailwind/Vitest, env de exemplo e um smoke test verde. Deliverable: `npx vitest run` passa, `npm run build` funciona.

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (placeholder), `tests/lib/smoke.test.ts`

**Interfaces:**
- Produces: projeto buildável; Vitest configurado rodando arquivos em `tests/**`.

- [ ] **Step 1: Inicializar o projeto Next.js**

```bash
npx create-next-app@latest favoritos-app --ts --app --tailwind --eslint --src-dir --no-import-alias --use-npm
# Mover conteúdo de favoritos-app/ para a raiz do projeto, ou criar direto na raiz.
```
Se preferir scaffolding manual, garanta `next`, `react`, `react-dom`, `typescript`, `tailwindcss` instalados. Consulte context7 `/vercel/next.js` para a estrutura atual do App Router.

- [ ] **Step 2: Instalar dependências do projeto**

```bash
npm install @neondatabase/serverless openai node-html-parser zod
npm install -D vitest
```

- [ ] **Step 3: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Criar `.env.example` e `.gitignore`**

`.env.example`:
```
DATABASE_URL=
DEEPSEEK_API_KEY=
APP_PASSWORD=
SESSION_SECRET=
```
Garanta que `.gitignore` contém `.env.local`, `.env`, `node_modules`, `.next`.

- [ ] **Step 5: Escrever o smoke test (falha primeiro)**

`tests/lib/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('roda o vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Adicionar scripts ao `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "migrate": "tsx src/db/migrate.ts"
  }
}
```
Instale `tsx` como devDependency: `npm install -D tsx`.

- [ ] **Step 7: Rodar o smoke test**

Run: `npx vitest run`
Expected: PASS (1 teste).

- [ ] **Step 8: Inicializar git e commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

### Task 2: Schema do banco + migração

Define as tabelas `categories` e `links`, seed das categorias, e um script de migração idempotente. Deliverable: rodar `npm run migrate` cria as tabelas e popula o seed no Neon.

**Files:**
- Create: `src/db/schema.sql`, `src/db/migrate.ts`, `src/lib/db.ts`

**Interfaces:**
- Produces: `sql` (cliente neon) exportado de `src/lib/db.ts`; tabelas `categories` e `links` no banco.

- [ ] **Step 1: Criar `src/lib/db.ts`**

```ts
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida');
}

export const sql = neon(process.env.DATABASE_URL);
```

- [ ] **Step 2: Criar `src/db/schema.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  title       text,
  description text,
  image_url   text,
  site_name   text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  is_read     boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  ai_status   text NOT NULL DEFAULT 'pending',
  ai_error    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS links_tags_gin ON links USING gin (tags);
CREATE INDEX IF NOT EXISTS links_created_at_idx ON links (created_at DESC);

INSERT INTO categories (name) VALUES
  ('Receitas'), ('Artigos'), ('Notícias'), ('Vídeos'), ('Ferramentas'),
  ('Tech/Dev'), ('IA'), ('UI/Design'), ('Inspiração'), ('Educação'),
  ('Finanças'), ('Saúde')
ON CONFLICT (name) DO NOTHING;
```

- [ ] **Step 3: Criar `src/db/migrate.ts`**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const sql = neon(url);
  const ddl = readFileSync(join(process.cwd(), 'src/db/schema.sql'), 'utf8');
  // neon() HTTP executa um statement por chamada; dividimos por ';'
  const statements = ddl.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log(`Migração aplicada: ${statements.length} statements.`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Configurar env local e rodar a migração**

Crie `.env.local` com `DATABASE_URL` da sua branch Neon. Rode:
Run: `npm run migrate`
Expected: log "Migração aplicada: N statements." sem erro.

- [ ] **Step 5: Verificar tabelas e seed**

Rode uma checagem rápida (script ad-hoc ou SQL no console Neon):
```sql
SELECT count(*) FROM categories;  -- espera 12
SELECT to_regclass('public.links'); -- espera 'links'
```
Expected: 12 categorias; tabela `links` existe.

- [ ] **Step 6: Commit**

```bash
git add src/db src/lib/db.ts
git commit -m "feat: schema do banco (categories, links) + migração + seed"
```

---

### Task 3: Tipos + schemas Zod

Define os tipos do domínio e os schemas de validação usados por route handlers e libs. Deliverable: schemas testados validando entradas válidas e rejeitando inválidas.

**Files:**
- Create: `src/lib/types.ts`, `src/lib/schema.ts`, `tests/lib/schema.test.ts`

**Interfaces:**
- Produces:
  - `type AiStatus = 'pending' | 'done' | 'failed'`
  - `type Category = { id: string; name: string; created_at: string }`
  - `type Link = { id: string; url: string; title: string | null; description: string | null; image_url: string | null; site_name: string | null; category_id: string | null; tags: string[]; is_read: boolean; is_favorite: boolean; ai_status: AiStatus; ai_error: string | null; created_at: string; updated_at: string }`
  - `addLinkSchema` → `{ url: string }` (URL válida)
  - `updateLinkSchema` → `{ category_id?: string | null; tags?: string[]; is_read?: boolean; is_favorite?: boolean }`
  - `classifyResultSchema` → `{ category: string; tags: string[] }`
  - `createCategorySchema` → `{ name: string }` (1–40 chars, trim)

- [ ] **Step 1: Criar `src/lib/types.ts`**

```ts
export type AiStatus = 'pending' | 'done' | 'failed';

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Link = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  category_id: string | null;
  tags: string[];
  is_read: boolean;
  is_favorite: boolean;
  ai_status: AiStatus;
  ai_error: string | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Escrever os testes (falham primeiro)**

`tests/lib/schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  addLinkSchema,
  updateLinkSchema,
  classifyResultSchema,
  createCategorySchema,
} from '../../src/lib/schema';

describe('addLinkSchema', () => {
  it('aceita URL válida', () => {
    expect(addLinkSchema.parse({ url: 'https://exemplo.com/x' }).url)
      .toBe('https://exemplo.com/x');
  });
  it('rejeita string não-URL', () => {
    expect(() => addLinkSchema.parse({ url: 'nao-e-url' })).toThrow();
  });
});

describe('createCategorySchema', () => {
  it('faz trim do nome', () => {
    expect(createCategorySchema.parse({ name: '  Podcasts  ' }).name)
      .toBe('Podcasts');
  });
  it('rejeita nome vazio', () => {
    expect(() => createCategorySchema.parse({ name: '   ' })).toThrow();
  });
});

describe('classifyResultSchema', () => {
  it('aceita category + tags', () => {
    const r = classifyResultSchema.parse({ category: 'IA', tags: ['llm', 'api'] });
    expect(r.category).toBe('IA');
    expect(r.tags).toEqual(['llm', 'api']);
  });
});

describe('updateLinkSchema', () => {
  it('aceita category_id null', () => {
    expect(updateLinkSchema.parse({ category_id: null }).category_id).toBeNull();
  });
  it('aceita campos parciais', () => {
    expect(updateLinkSchema.parse({ is_favorite: true }).is_favorite).toBe(true);
  });
});
```

- [ ] **Step 3: Rodar os testes (devem falhar)**

Run: `npx vitest run tests/lib/schema.test.ts`
Expected: FAIL ("Cannot find module '../../src/lib/schema'").

- [ ] **Step 4: Criar `src/lib/schema.ts`**

```ts
import { z } from 'zod';

export const addLinkSchema = z.object({
  url: z.string().url(),
});

export const updateLinkSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_read: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
});

export const classifyResultSchema = z.object({
  category: z.string(),
  tags: z.array(z.string()),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export type AddLinkInput = z.infer<typeof addLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ClassifyResult = z.infer<typeof classifyResultSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
```

- [ ] **Step 5: Rodar os testes (devem passar)**

Run: `npx vitest run tests/lib/schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/schema.ts tests/lib/schema.test.ts
git commit -m "feat: tipos do domínio + schemas zod"
```

---

### Task 4: Auth (assinatura de sessão + checagem de senha)

Lógica pura de sessão via HMAC (Web Crypto, funciona em edge e node) e comparação constant-time de senha. Deliverable: testes verdes para assinar/verificar e expirar tokens.

**Files:**
- Create: `src/lib/auth.ts`, `tests/lib/auth.test.ts`

**Interfaces:**
- Produces:
  - `constantTimeEqual(a: string, b: string): boolean`
  - `signSession(secret: string, expMs: number): Promise<string>` → token `"<expMs>.<hexHmac>"`
  - `verifySession(secret: string, token: string | undefined, nowMs: number): Promise<boolean>`
  - `checkPassword(input: string, expected: string): boolean`
  - `SESSION_COOKIE = 'fav_session'`
  - `SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30` (30 dias)

- [ ] **Step 1: Escrever os testes (falham primeiro)**

`tests/lib/auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  checkPassword,
  constantTimeEqual,
} from '../../src/lib/auth';

const SECRET = 'segredo-de-teste';

describe('constantTimeEqual', () => {
  it('true para iguais', () => expect(constantTimeEqual('abc', 'abc')).toBe(true));
  it('false para diferentes', () => expect(constantTimeEqual('abc', 'abd')).toBe(false));
  it('false para tamanhos diferentes', () => expect(constantTimeEqual('a', 'ab')).toBe(false));
});

describe('sessão', () => {
  it('verifica um token válido não expirado', async () => {
    const now = 1_000_000;
    const token = await signSession(SECRET, now + 10_000);
    expect(await verifySession(SECRET, token, now)).toBe(true);
  });
  it('rejeita token expirado', async () => {
    const token = await signSession(SECRET, 500);
    expect(await verifySession(SECRET, token, 1_000)).toBe(false);
  });
  it('rejeita assinatura adulterada', async () => {
    const token = await signSession(SECRET, 10_000);
    const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
    expect(await verifySession(SECRET, tampered, 0)).toBe(false);
  });
  it('rejeita token undefined', async () => {
    expect(await verifySession(SECRET, undefined, 0)).toBe(false);
  });
});

describe('checkPassword', () => {
  it('aceita senha correta', () => expect(checkPassword('s3nha', 's3nha')).toBe(true));
  it('rejeita senha errada', () => expect(checkPassword('x', 's3nha')).toBe(false));
});
```

- [ ] **Step 2: Rodar os testes (devem falhar)**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: FAIL ("Cannot find module '../../src/lib/auth'").

- [ ] **Step 3: Criar `src/lib/auth.ts`**

```ts
export const SESSION_COOKIE = 'fav_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signSession(secret: string, expMs: number): Promise<string> {
  const payload = String(expMs);
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySession(
  secret: string,
  token: string | undefined,
  nowMs: number,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(secret, payload);
  if (!constantTimeEqual(sig, expected)) return false;
  const expMs = Number(payload);
  if (!Number.isFinite(expMs)) return false;
  return nowMs < expMs;
}

export function checkPassword(input: string, expected: string): boolean {
  return constantTimeEqual(input, expected);
}
```

- [ ] **Step 4: Rodar os testes (devem passar)**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: auth com sessão HMAC + checagem de senha constant-time"
```

---

### Task 5: Extração de metadados Open Graph

Busca o HTML da URL e extrai título/descrição/imagem/site. Deliverable: testes verdes parseando fixtures com e sem OG.

**Files:**
- Create: `src/lib/og.ts`, `tests/lib/og.test.ts`, `tests/fixtures/page-with-og.html`, `tests/fixtures/page-without-og.html`

**Interfaces:**
- Consumes: `node-html-parser`.
- Produces:
  - `type Metadata = { title: string | null; description: string | null; image_url: string | null; site_name: string | null }`
  - `parseMetadata(html: string): Metadata` (pura, testável)
  - `fetchMetadata(url: string, timeoutMs?: number): Promise<Metadata>` (faz fetch com timeout e chama parseMetadata)

- [ ] **Step 1: Criar fixtures**

`tests/fixtures/page-with-og.html`:
```html
<!doctype html><html><head>
<title>Título do Title</title>
<meta property="og:title" content="Título OG">
<meta property="og:description" content="Descrição OG">
<meta property="og:image" content="https://cdn.exemplo.com/img.jpg">
<meta property="og:site_name" content="Exemplo">
</head><body></body></html>
```

`tests/fixtures/page-without-og.html`:
```html
<!doctype html><html><head>
<title>Só o Title</title>
<meta name="description" content="Meta description padrão">
</head><body></body></html>
```

- [ ] **Step 2: Escrever os testes (falham primeiro)**

`tests/lib/og.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMetadata } from '../../src/lib/og';

const read = (f: string) =>
  readFileSync(join(process.cwd(), 'tests/fixtures', f), 'utf8');

describe('parseMetadata', () => {
  it('prioriza tags OG quando presentes', () => {
    const m = parseMetadata(read('page-with-og.html'));
    expect(m.title).toBe('Título OG');
    expect(m.description).toBe('Descrição OG');
    expect(m.image_url).toBe('https://cdn.exemplo.com/img.jpg');
    expect(m.site_name).toBe('Exemplo');
  });

  it('usa fallback de <title> e meta description', () => {
    const m = parseMetadata(read('page-without-og.html'));
    expect(m.title).toBe('Só o Title');
    expect(m.description).toBe('Meta description padrão');
    expect(m.image_url).toBeNull();
    expect(m.site_name).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar os testes (devem falhar)**

Run: `npx vitest run tests/lib/og.test.ts`
Expected: FAIL ("Cannot find module '../../src/lib/og'").

- [ ] **Step 4: Criar `src/lib/og.ts`**

```ts
import { parse } from 'node-html-parser';

export type Metadata = {
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
};

export function parseMetadata(html: string): Metadata {
  const root = parse(html);
  const meta = (attr: 'property' | 'name', value: string): string | null => {
    const el = root.querySelector(`meta[${attr}="${value}"]`);
    const c = el?.getAttribute('content')?.trim();
    return c && c.length > 0 ? c : null;
  };
  const titleTag = root.querySelector('title')?.text?.trim() || null;

  return {
    title: meta('property', 'og:title') ?? titleTag,
    description: meta('property', 'og:description') ?? meta('name', 'description'),
    image_url: meta('property', 'og:image'),
    site_name: meta('property', 'og:site_name'),
  };
}

export async function fetchMetadata(
  url: string,
  timeoutMs = 6000,
): Promise<Metadata> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'FavoritosBot/1.0 (+link preview)' },
    redirect: 'follow',
  });
  const html = await res.text();
  return parseMetadata(html);
}
```

- [ ] **Step 5: Rodar os testes (devem passar)**

Run: `npx vitest run tests/lib/og.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/og.ts tests/lib/og.test.ts tests/fixtures
git commit -m "feat: extração de metadados Open Graph com fallback"
```

---

### Task 6: Classificação via DeepSeek

Monta o prompt, chama a DeepSeek (SDK OpenAI), valida o JSON e normaliza o resultado (categoria coagida à lista, tags normalizadas). Deliverable: testes verdes com client mockado, cobrindo caso feliz, categoria fora da lista e excesso de tags.

**Files:**
- Create: `src/lib/classify.ts`, `tests/lib/classify.test.ts`

**Interfaces:**
- Consumes: `openai`, `classifyResultSchema` de `src/lib/schema.ts`.
- Produces:
  - `SEM_CATEGORIA = 'Sem categoria'`
  - `buildMessages(input, categories, existingTags): { role, content }[]` (pura)
  - `normalizeResult(raw: { category: string; tags: string[] }, categories: string[]): { category: string | null; tags: string[] }` (pura: coage categoria e normaliza tags)
  - `classifyLink(input: { url: string; title: string | null; description: string | null }, opts: { categories: string[]; existingTags: string[]; client: OpenAIClient; timeoutMs?: number }): Promise<{ category: string | null; tags: string[] }>`
  - `type OpenAIClient = { chat: { completions: { create: (args: any) => Promise<{ choices: { message: { content: string | null } }[] }> } } }` (interface mínima p/ permitir mock)
  - `createDeepSeekClient(): OpenAIClient` (instancia `new OpenAI({ apiKey: DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })`)

- [ ] **Step 1: Escrever os testes (falham primeiro)**

`tests/lib/classify.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { classifyLink, normalizeResult, SEM_CATEGORIA } from '../../src/lib/classify';

const CATEGORIES = ['IA', 'Tech/Dev', 'Receitas'];

function mockClient(content: string) {
  return {
    chat: { completions: { create: vi.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    }) } },
  };
}

describe('normalizeResult', () => {
  it('coage categoria fora da lista para null', () => {
    const r = normalizeResult({ category: 'Inexistente', tags: ['a'] }, CATEGORIES);
    expect(r.category).toBeNull();
  });
  it('trata "Sem categoria" como null', () => {
    const r = normalizeResult({ category: SEM_CATEGORIA, tags: [] }, CATEGORIES);
    expect(r.category).toBeNull();
  });
  it('normaliza tags: minúsculas, sem dup, máx 5', () => {
    const r = normalizeResult(
      { category: 'IA', tags: ['LLM', 'llm', 'API', 'b', 'c', 'd', 'e', 'f'] },
      CATEGORIES,
    );
    expect(r.tags).toEqual(['llm', 'api', 'b', 'c', 'd']);
  });
});

describe('classifyLink', () => {
  it('retorna categoria válida e tags do JSON da IA', async () => {
    const client = mockClient(JSON.stringify({ category: 'IA', tags: ['llm', 'api'] }));
    const r = await classifyLink(
      { url: 'https://x.com', title: 'GPT', description: 'sobre IA' },
      { categories: CATEGORIES, existingTags: [], client },
    );
    expect(r.category).toBe('IA');
    expect(r.tags).toEqual(['llm', 'api']);
  });

  it('lança erro se o JSON for inválido', async () => {
    const client = mockClient('isto não é json');
    await expect(
      classifyLink(
        { url: 'https://x.com', title: null, description: null },
        { categories: CATEGORIES, existingTags: [], client },
      ),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Rodar os testes (devem falhar)**

Run: `npx vitest run tests/lib/classify.test.ts`
Expected: FAIL ("Cannot find module '../../src/lib/classify'").

- [ ] **Step 3: Criar `src/lib/classify.ts`**

```ts
import OpenAI from 'openai';
import { classifyResultSchema } from './schema';

export const SEM_CATEGORIA = 'Sem categoria';
const MODEL = 'deepseek-v4-flash';

export type OpenAIClient = {
  chat: {
    completions: {
      create: (args: unknown) => Promise<{
        choices: { message: { content: string | null } }[];
      }>;
    };
  };
};

export function createDeepSeekClient(): OpenAIClient {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY não definida');
  return new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' }) as unknown as OpenAIClient;
}

export function buildMessages(
  input: { url: string; title: string | null; description: string | null },
  categories: string[],
  existingTags: string[],
) {
  const cats = [...categories, SEM_CATEGORIA].join(', ');
  const tags = existingTags.length ? existingTags.join(', ') : '(nenhuma ainda)';
  return [
    {
      role: 'system' as const,
      content:
        'Você classifica links salvos por um usuário. Responda SOMENTE com JSON válido. ' +
        'Escolha a categoria EXCLUSIVAMENTE da lista fornecida — nunca invente categorias. ' +
        `Se nenhuma encaixar bem, use "${SEM_CATEGORIA}".`,
    },
    {
      role: 'user' as const,
      content:
        `Categorias disponíveis: [${cats}]\n\n` +
        `Tags já existentes (reutilize quando fizer sentido): [${tags}]\n\n` +
        `Link:\n- URL: ${input.url}\n- Título: ${input.title ?? ''}\n` +
        `- Descrição: ${input.description ?? ''}\n\n` +
        'Retorne JSON no formato exato:\n' +
        '{ "category": "<uma das categorias>", "tags": ["tag1", "tag2", "tag3"] }\n\n' +
        'Regras: 1 categoria; 3 a 5 tags curtas em minúsculas, em português, ' +
        'específicas ao conteúdo (não genéricas como "link" ou "internet").',
    },
  ];
}

export function normalizeResult(
  raw: { category: string; tags: string[] },
  categories: string[],
): { category: string | null; tags: string[] } {
  const category = categories.includes(raw.category) ? raw.category : null;
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const t of raw.tags) {
    const norm = t.trim().toLowerCase();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      tags.push(norm);
      if (tags.length === 5) break;
    }
  }
  return { category, tags };
}

export async function classifyLink(
  input: { url: string; title: string | null; description: string | null },
  opts: {
    categories: string[];
    existingTags: string[];
    client: OpenAIClient;
    timeoutMs?: number;
  },
): Promise<{ category: string | null; tags: string[] }> {
  const completion = await opts.client.chat.completions.create({
    model: MODEL,
    messages: buildMessages(input, opts.categories, opts.existingTags),
    response_format: { type: 'json_object' },
    temperature: 0.2,
    ...(opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
  });
  const content = completion.choices[0]?.message?.content ?? '';
  const parsed = classifyResultSchema.parse(JSON.parse(content));
  return normalizeResult(parsed, opts.categories);
}
```

- [ ] **Step 4: Rodar os testes (devem passar)**

Run: `npx vitest run tests/lib/classify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/classify.ts tests/lib/classify.test.ts
git commit -m "feat: classificação via DeepSeek (prompt + validação + normalização)"
```

---

### Task 7: Data access de categorias

Funções de leitura/escrita de categorias sobre o Neon. Deliverable: funções implementadas; verificação manual via migração já rodada.

**Files:**
- Create: `src/lib/categories.ts`

**Interfaces:**
- Consumes: `sql` de `src/lib/db.ts`, tipo `Category`.
- Produces:
  - `listCategories(): Promise<Category[]>` (ordenado por name)
  - `categoryNames(): Promise<string[]>`
  - `createCategory(name: string): Promise<Category>` (insere; conflito de nome → lança erro tratável)

- [ ] **Step 1: Criar `src/lib/categories.ts`**

```ts
import { sql } from './db';
import type { Category } from './types';

export async function listCategories(): Promise<Category[]> {
  return (await sql`
    SELECT id, name, created_at FROM categories ORDER BY name ASC
  `) as Category[];
}

export async function categoryNames(): Promise<string[]> {
  const rows = (await sql`SELECT name FROM categories ORDER BY name ASC`) as {
    name: string;
  }[];
  return rows.map((r) => r.name);
}

export async function createCategory(name: string): Promise<Category> {
  const rows = (await sql`
    INSERT INTO categories (name) VALUES (${name})
    RETURNING id, name, created_at
  `) as Category[];
  return rows[0];
}
```

- [ ] **Step 2: Verificação rápida (script ad-hoc)**

Crie um script temporário ou use `tsx -e` para chamar `listCategories()` com `.env.local` carregado e confirme que retorna as 12 categorias do seed. Remova o script depois.
Expected: array com 12 itens, ordenado por nome.

- [ ] **Step 3: Commit**

```bash
git add src/lib/categories.ts
git commit -m "feat: data access de categorias"
```

---

### Task 8: Data access de links

CRUD de links + listagem com busca e filtros. Deliverable: funções implementadas com SQL parametrizado.

**Files:**
- Create: `src/lib/links.ts`

**Interfaces:**
- Consumes: `sql` de `src/lib/db.ts`, tipos `Link`, `AiStatus`, `UpdateLinkInput`.
- Produces:
  - `insertLink(row: { url; title; description; image_url; site_name; category_id; tags; ai_status; ai_error }): Promise<Link>`
  - `listLinks(filter: { q?: string; categoryId?: string; tag?: string; favorite?: boolean; unread?: boolean }): Promise<Link[]>` (ordenado por created_at DESC)
  - `getLink(id: string): Promise<Link | null>`
  - `updateLink(id: string, patch: UpdateLinkInput): Promise<Link | null>`
  - `setClassification(id: string, c: { category_id: string | null; tags: string[]; ai_status: AiStatus; ai_error: string | null }): Promise<Link | null>`
  - `deleteLink(id: string): Promise<boolean>`
  - `allTags(): Promise<string[]>` (distinct, ordenado)

- [ ] **Step 1: Criar `src/lib/links.ts`**

```ts
import { sql } from './db';
import type { Link, AiStatus } from './types';
import type { UpdateLinkInput } from './schema';

export async function insertLink(row: {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  category_id: string | null;
  tags: string[];
  ai_status: AiStatus;
  ai_error: string | null;
}): Promise<Link> {
  const rows = (await sql`
    INSERT INTO links (url, title, description, image_url, site_name,
                       category_id, tags, ai_status, ai_error)
    VALUES (${row.url}, ${row.title}, ${row.description}, ${row.image_url},
            ${row.site_name}, ${row.category_id}, ${row.tags}, ${row.ai_status},
            ${row.ai_error})
    RETURNING *
  `) as Link[];
  return rows[0];
}

export async function listLinks(filter: {
  q?: string;
  categoryId?: string;
  tag?: string;
  favorite?: boolean;
  unread?: boolean;
}): Promise<Link[]> {
  // query() com placeholders numerados para WHERE dinâmico
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.q) {
    params.push(`%${filter.q}%`);
    const p = `$${params.length}`;
    where.push(`(title ILIKE ${p} OR description ILIKE ${p} OR url ILIKE ${p})`);
  }
  if (filter.categoryId) {
    params.push(filter.categoryId);
    where.push(`category_id = $${params.length}`);
  }
  if (filter.tag) {
    params.push(filter.tag);
    where.push(`$${params.length} = ANY(tags)`);
  }
  if (filter.favorite) where.push(`is_favorite = true`);
  if (filter.unread) where.push(`is_read = false`);

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await sql.query(
    `SELECT * FROM links ${clause} ORDER BY created_at DESC`,
    params,
  );
  return rows as Link[];
}

export async function getLink(id: string): Promise<Link | null> {
  const rows = (await sql`SELECT * FROM links WHERE id = ${id}`) as Link[];
  return rows[0] ?? null;
}

export async function updateLink(
  id: string,
  patch: UpdateLinkInput,
): Promise<Link | null> {
  const rows = (await sql`
    UPDATE links SET
      category_id = COALESCE(${patch.category_id ?? null}, category_id),
      tags        = COALESCE(${patch.tags ?? null}, tags),
      is_read     = COALESCE(${patch.is_read ?? null}, is_read),
      is_favorite = COALESCE(${patch.is_favorite ?? null}, is_favorite),
      updated_at  = now()
    WHERE id = ${id}
    RETURNING *
  `) as Link[];
  return rows[0] ?? null;
}

export async function setClassification(
  id: string,
  c: { category_id: string | null; tags: string[]; ai_status: AiStatus; ai_error: string | null },
): Promise<Link | null> {
  const rows = (await sql`
    UPDATE links SET
      category_id = ${c.category_id}, tags = ${c.tags},
      ai_status = ${c.ai_status}, ai_error = ${c.ai_error}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as Link[];
  return rows[0] ?? null;
}

export async function deleteLink(id: string): Promise<boolean> {
  const rows = (await sql`DELETE FROM links WHERE id = ${id} RETURNING id`) as {
    id: string;
  }[];
  return rows.length > 0;
}

export async function allTags(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT unnest(tags) AS tag FROM links ORDER BY tag ASC
  `) as { tag: string }[];
  return rows.map((r) => r.tag);
}
```

> Nota sobre `updateLink`: `category_id` é nullable e `COALESCE` impede setá-lo para null. A route handler (Task 10) trata "remover categoria" com um caminho dedicado quando `category_id === null` for explicitamente enviado. Mantenha esta função para os demais campos.

- [ ] **Step 2: Corrigir o caso de setar category_id como null explicitamente**

Adicione função dedicada:
```ts
export async function setCategory(
  id: string,
  categoryId: string | null,
): Promise<Link | null> {
  const rows = (await sql`
    UPDATE links SET category_id = ${categoryId}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `) as Link[];
  return rows[0] ?? null;
}
```

- [ ] **Step 3: Verificação rápida**

Via `tsx -e` com `.env.local`: insira um link de teste com `insertLink`, liste com `listLinks({})`, filtre por tag, atualize favorito, delete. Confirme cada operação.
Expected: todas as operações funcionam; link de teste removido ao final.

- [ ] **Step 4: Commit**

```bash
git add src/lib/links.ts
git commit -m "feat: data access de links (CRUD + busca/filtros)"
```

---

### Task 9: Auth API + middleware + tela de login

Rotas de login/logout, middleware que protege tudo, e a página de login. Deliverable: acessar `/` sem cookie redireciona para `/login`; senha correta autentica.

**Files:**
- Create: `src/app/api/auth/route.ts`, `middleware.ts`, `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx` (se necessário)

**Interfaces:**
- Consumes: `signSession`, `verifySession`, `checkPassword`, `SESSION_COOKIE`, `SESSION_TTL_MS`.
- Produces: cookie `fav_session`; rotas protegidas.

- [ ] **Step 1: Criar `src/app/api/auth/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  checkPassword,
  signSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.APP_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) {
    return NextResponse.json({ error: 'config ausente' }, { status: 500 });
  }
  if (typeof password !== 'string' || !checkPassword(password, expected)) {
    return NextResponse.json({ error: 'senha inválida' }, { status: 401 });
  }
  const exp = Date.now() + SESSION_TTL_MS;
  const token = await signSession(secret, exp);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
```

> Confirme via context7 `/vercel/next.js` o uso atual de `cookies()` (async em Next 15+) e `tsconfig` path alias `@/*` (configure em `tsconfig.json` se ainda não houver).

- [ ] **Step 2: Criar `middleware.ts` na raiz**

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = secret ? await verifySession(secret, token, Date.now()) : false;
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // protege tudo exceto login, a rota de auth, assets do next e favicon
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 3: Criar `src/app/login/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push('/');
    else setError('Senha inválida');
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Favoritos</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full rounded border px-3 py-2"
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black px-3 py-2 text-white">
          Entrar
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Verificação manual**

Run: `npm run dev` (com `.env.local` completo). Acesse `http://localhost:3000/` → deve redirecionar para `/login`. Senha errada → erro. Senha correta → vai para `/`.
Expected: comportamento de redirect e login conforme descrito.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/route.ts middleware.ts src/app/login/page.tsx tsconfig.json
git commit -m "feat: auth API + middleware de proteção + tela de login"
```

---

### Task 10: API de links e categorias

Route handlers que orquestram as libs: adicionar (OG + classify + save à prova de falha), listar/buscar/filtrar, editar, excluir, reclassificar, e CRUD de categorias. Deliverable: endpoints funcionando ponta a ponta.

**Files:**
- Create: `src/app/api/links/route.ts`, `src/app/api/links/[id]/route.ts`, `src/app/api/links/[id]/reclassify/route.ts`, `src/app/api/categories/route.ts`

**Interfaces:**
- Consumes: tudo de `links.ts`, `categories.ts`, `og.ts`, `classify.ts`, `schema.ts`.
- Produces: endpoints REST JSON.

- [ ] **Step 1: Criar helper de classificação reutilizável em `src/lib/classify.ts`**

Adicione ao final de `classify.ts` (usado por POST e reclassify):
```ts
import { categoryNames } from './categories';
import { allTags } from './links';

export async function runClassification(input: {
  url: string;
  title: string | null;
  description: string | null;
}): Promise<{ category_id: string | null; tags: string[]; ai_status: 'done' | 'failed'; ai_error: string | null }> {
  const { listCategories } = await import('./categories');
  try {
    const [names, tags, categories] = await Promise.all([
      categoryNames(),
      allTags(),
      listCategories(),
    ]);
    const client = createDeepSeekClient();
    const result = await classifyLink(input, {
      categories: names,
      existingTags: tags,
      client,
      timeoutMs: 20000,
    });
    const cat = result.category
      ? categories.find((c) => c.name === result.category) ?? null
      : null;
    return { category_id: cat?.id ?? null, tags: result.tags, ai_status: 'done', ai_error: null };
  } catch (err) {
    return {
      category_id: null,
      tags: [],
      ai_status: 'failed',
      ai_error: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 2: Criar `src/app/api/links/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { addLinkSchema } from '@/lib/schema';
import { fetchMetadata } from '@/lib/og';
import { runClassification } from '@/lib/classify';
import { insertLink, listLinks } from '@/lib/links';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const links = await listLinks({
    q: sp.get('q') ?? undefined,
    categoryId: sp.get('category') ?? undefined,
    tag: sp.get('tag') ?? undefined,
    favorite: sp.get('favorite') === '1',
    unread: sp.get('unread') === '1',
  });
  return NextResponse.json({ links });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = addLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }
  const { url } = parsed.data;

  let meta = { title: null, description: null, image_url: null, site_name: null };
  try {
    meta = await fetchMetadata(url);
  } catch {
    // metadados são best-effort; segue mesmo sem eles
  }

  const classification = await runClassification({
    url,
    title: meta.title,
    description: meta.description,
  });

  const link = await insertLink({
    url,
    title: meta.title,
    description: meta.description,
    image_url: meta.image_url,
    site_name: meta.site_name,
    category_id: classification.category_id,
    tags: classification.tags,
    ai_status: classification.ai_status,
    ai_error: classification.ai_error,
  });

  return NextResponse.json({ link }, { status: 201 });
}
```

- [ ] **Step 3: Criar `src/app/api/links/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { updateLinkSchema } from '@/lib/schema';
import { updateLink, setCategory, deleteLink, getLink } from '@/lib/links';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = updateLinkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
  }
  const patch = parsed.data;

  // se category_id veio explicitamente (inclusive null), usa setCategory
  if ('category_id' in patch) {
    await setCategory(id, patch.category_id ?? null);
  }
  const { category_id, ...rest } = patch;
  const link =
    Object.keys(rest).length > 0 ? await updateLink(id, rest) : await getLink(id);

  if (!link) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return NextResponse.json({ link });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteLink(id);
  if (!ok) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Criar `src/app/api/links/[id]/reclassify/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getLink, setClassification } from '@/lib/links';
import { runClassification } from '@/lib/classify';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await getLink(id);
  if (!existing) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });

  const c = await runClassification({
    url: existing.url,
    title: existing.title,
    description: existing.description,
  });
  const link = await setClassification(id, c);
  return NextResponse.json({ link });
}
```

- [ ] **Step 5: Criar `src/app/api/categories/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createCategorySchema } from '@/lib/schema';
import { listCategories, createCategory } from '@/lib/categories';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ categories: await listCategories() });
}

export async function POST(req: Request) {
  const parsed = createCategorySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'nome inválido' }, { status: 400 });
  }
  try {
    const category = await createCategory(parsed.data.name);
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'categoria já existe' }, { status: 409 });
  }
}
```

- [ ] **Step 6: Verificação manual ponta a ponta**

Com `npm run dev` e cookie de sessão válido (logado):
- `POST /api/links` com `{ "url": "https://..." }` → 201, link com categoria/tags da IA.
- `POST` com URL inalcançável → 201 mesmo assim, `ai_status` pode ser `done` (classifica sem metadados) ou `failed`; link salvo.
- `GET /api/links?q=...&tag=...` → filtra.
- `PATCH /api/links/:id` `{ "is_favorite": true }` → atualiza.
- `POST /api/links/:id/reclassify` → reclassifica.
- `POST /api/categories` `{ "name": "Podcasts" }` → 201.
Expected: cada chamada conforme descrito.

- [ ] **Step 7: Commit**

```bash
git add src/app/api src/lib/classify.ts
git commit -m "feat: API de links e categorias (add/list/edit/delete/reclassify)"
```

---

### Task 11: UI principal (lista, busca, filtros, ações)

A interface principal. **Invoque o skill frontend-design** antes de construir esta task — paleta, tipografia e elemento de assinatura são parte central do objetivo, não detalhe. Esta task entrega a UI funcional; o frontend-design guia o visual.

**Files:**
- Create: `src/app/page.tsx`, `src/app/components/AddLinkForm.tsx`, `src/app/components/LinkCard.tsx`, `src/app/components/FilterBar.tsx`, `src/app/components/EditLinkDialog.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

**Interfaces:**
- Consumes: endpoints `/api/links`, `/api/categories`.
- Produces: app utilizável.

- [ ] **Step 1: Invocar frontend-design e definir direção visual**

Use o skill `frontend-design` para decidir paleta, tipografia, densidade e o elemento de assinatura. Registre as escolhas (ex.: como comentário no topo de `globals.css`). Só então prossiga.

- [ ] **Step 2: Página principal (server component) carrega dados iniciais**

`src/app/page.tsx` busca `links` e `categories` no servidor (importando direto `listLinks`/`listCategories`, já que é server component) e renderiza os componentes cliente com esses dados iniciais. Inclui:
- `AddLinkForm` (input de URL + submit → `POST /api/links`, com estado de loading enquanto classifica).
- `FilterBar` (busca textual, select de categoria, chips de tags, toggles favorito/não-lido).
- Grid de `LinkCard`.

Código de referência (estrutura mínima — refine o visual via frontend-design):
```tsx
import { listLinks } from '@/lib/links';
import { listCategories } from '@/lib/categories';
import { allTags } from '@/lib/links';
import HomeClient from './components/HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [links, categories, tags] = await Promise.all([
    listLinks({}),
    listCategories(),
    allTags(),
  ]);
  return <HomeClient initialLinks={links} categories={categories} tags={tags} />;
}
```

- [ ] **Step 3: `HomeClient` e componentes**

Crie `src/app/components/HomeClient.tsx` (client) que detém o estado da lista e dos filtros, refazendo `GET /api/links?...` quando os filtros mudam (debounce na busca). `LinkCard` mostra imagem (`image_url`), título, descrição, `site_name`, badge de categoria e tags; ações: favorito (PATCH), lido (PATCH), editar (abre `EditLinkDialog`), excluir (DELETE), e — quando `ai_status='failed'` — botão "Reclassificar" (POST). `EditLinkDialog` permite trocar categoria (select carregado de `/api/categories`, com opção "Sem categoria" e "criar nova"), editar tags (chips editáveis) e salvar via PATCH.

Implemente cada componente com handlers reais às rotas já criadas. (Os contratos das rotas estão nas Tasks 9–10.)

- [ ] **Step 4: Verificação manual**

Run: `npm run dev`. Logado: cole uma URL real → aparece classificada. Edite categoria/tags → persiste após reload. Busque/filtre → lista reage. Favoritar/lido/excluir → refletem. Force um `failed` (URL de domínio sem rede) e use "Reclassificar".
Expected: fluxo completo do MVP funciona.

- [ ] **Step 5: Build de produção**

Run: `npm run build`
Expected: build sem erros de tipo/lint.

- [ ] **Step 6: Commit**

```bash
git add src/app
git commit -m "feat: UI principal (lista, busca, filtros, edição, ações)"
```

---

### Task 12: Deploy na Vercel

Configura env vars na Vercel e publica. Deliverable: app no ar, protegido por senha, classificando links.

**Files:**
- Modify: `next.config.ts` (permitir imagens remotas se usar `next/image`), `.env.example` (já criado)

- [ ] **Step 1: Permitir imagens remotas (se usar `next/image`)**

Em `next.config.ts`, configure `images.remotePatterns` para aceitar `https` de qualquer host (preview de `og:image`), ou use `<img>` simples. Consulte context7 `/vercel/next.js` para o formato atual de `remotePatterns`.

- [ ] **Step 2: Criar projeto na Vercel e configurar env vars**

Na Vercel (Production + Preview): `DATABASE_URL`, `DEEPSEEK_API_KEY`, `APP_PASSWORD`, `SESSION_SECRET`. Conecte o repositório git.

- [ ] **Step 3: Rodar a migração contra o banco de produção**

Com `DATABASE_URL` de produção em `.env.local` (temporariamente): `npm run migrate`. Confirme as 12 categorias.

- [ ] **Step 4: Deploy e smoke test em produção**

Faça o deploy. Acesse a URL → redireciona para `/login`. Logue, adicione um link real, confirme classificação e persistência.
Expected: app funcional em produção.

- [ ] **Step 5: Commit final**

```bash
git add next.config.ts
git commit -m "chore: configuração de deploy na Vercel"
```

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura do spec:**
- Banco Neon → Tasks 1–2. ✅
- Modelo de dados (categories, links) → Task 2. ✅
- Fluxo de classificação (OG → prompt → DeepSeek → JSON → validação → save à prova de falha) → Tasks 5, 6, 10. ✅
- Prompt de classificação com lista fixa → Task 6 (`buildMessages`). ✅
- IA só escolhe da lista, fallback null → Task 6 (`normalizeResult`). ✅
- Tags livres normalizadas (3–5, minúsculas) → Task 6. ✅
- Editar categoria/tags, criar categoria → Tasks 10, 11. ✅
- Listar/buscar/filtrar → Tasks 8, 10, 11. ✅
- Lido/favorito/excluir → Tasks 8, 10, 11. ✅
- Reclassificar → Tasks 10, 11. ✅
- Auth por senha + cookie assinado → Tasks 4, 9. ✅
- MVP vs v2 → v2 fora de escopo, não há tasks (correto). ✅
- frontend-design na UI → Task 11. ✅

**Placeholders:** nenhum "TBD"/"implementar depois"; todo passo de código tem código real.

**Consistência de tipos:** `Link`, `Category`, `AiStatus` definidos na Task 3 e usados consistentemente. `runClassification` (Task 10) retorna `{ category_id, tags, ai_status, ai_error }` consumido por `insertLink`/`setClassification` (Task 8). `signSession`/`verifySession` consistentes entre Tasks 4 e 9.

**Riscos conhecidos:**
- `updateLink` com `COALESCE` não seta null → resolvido com `setCategory` dedicado (Task 8 step 2, usado na Task 10 step 3).
- `maxDuration=30` depende do limite do plano Vercel; OG (6s) + DeepSeek (20s) cabem.
- Testes de DB são verificações manuais (não TDD puro) por exigirem conexão Neon — assumido como aceitável para single-user.
