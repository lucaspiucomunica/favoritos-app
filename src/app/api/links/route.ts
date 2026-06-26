import { NextResponse } from 'next/server';
import { addLinkSchema } from '@/lib/schema';
import { fetchMetadata, type Metadata } from '@/lib/og';
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

  let meta: Metadata = { title: null, description: null, image_url: null, site_name: null };
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
