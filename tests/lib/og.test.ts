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
