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
