import OpenAI from 'openai';
import { classifyResultSchema } from './schema';
import { categoryNames, listCategories } from './categories';
import { allTags } from './links';

export const SEM_CATEGORIA = 'Sem categoria';
const MODEL = 'deepseek-v4-flash';

export type OpenAIClient = {
  chat: {
    completions: {
      create: (
        body: unknown,
        options?: unknown,
      ) => Promise<{
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
        '{ "category": "<uma das categorias>", "tags": ["tag1", "tag2", "tag3"], "title": "<título sugerido ou null>" }\n\n' +
        'Regras:\n' +
        '- category: 1 categoria da lista.\n' +
        '- tags: 3 a 5 tags curtas em minúsculas, em português, específicas ao ' +
        'conteúdo (não genéricas como "link" ou "internet").\n' +
        '- title: sugira um título curto e claro (no máximo ~70 caracteres, em português) ' +
        'APENAS se o título atual estiver ausente, for longo demais, confuso, ou for um ' +
        'trecho do corpo do post em vez de um título de verdade (comum em redes sociais). ' +
        'Se o título atual já for bom e conciso, retorne null. Nunca invente fatos: ' +
        'baseie-se no conteúdo fornecido.',
    },
  ];
}

export function normalizeResult(
  raw: { category: string; tags: string[]; title?: string | null },
  categories: string[],
): { category: string | null; tags: string[]; title: string | null } {
  const category =
    categories.includes(raw.category) && raw.category !== SEM_CATEGORIA
      ? raw.category
      : null;
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
  const title =
    typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : null;
  return { category, tags, title };
}

export async function classifyLink(
  input: { url: string; title: string | null; description: string | null },
  opts: {
    categories: string[];
    existingTags: string[];
    client: OpenAIClient;
    timeoutMs?: number;
  },
): Promise<{ category: string | null; tags: string[]; title: string | null }> {
  const completion = await opts.client.chat.completions.create(
    {
      model: MODEL,
      messages: buildMessages(input, opts.categories, opts.existingTags),
      response_format: { type: 'json_object' },
      temperature: 0.2,
    },
    opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : undefined,
  );
  const content = completion.choices[0]?.message?.content ?? '';
  const parsed = classifyResultSchema.parse(JSON.parse(content));
  return normalizeResult(parsed, opts.categories);
}

export async function runClassification(input: {
  url: string;
  title: string | null;
  description: string | null;
}): Promise<{
  category_id: string | null;
  tags: string[];
  title: string | null;
  ai_status: 'done' | 'failed';
  ai_error: string | null;
}> {
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
    return {
      category_id: cat?.id ?? null,
      tags: result.tags,
      title: result.title,
      ai_status: 'done',
      ai_error: null,
    };
  } catch (err) {
    return {
      category_id: null,
      tags: [],
      title: null,
      ai_status: 'failed',
      ai_error: err instanceof Error ? err.message : String(err),
    };
  }
}
