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
