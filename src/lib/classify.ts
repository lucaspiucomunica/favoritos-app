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
