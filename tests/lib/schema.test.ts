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
