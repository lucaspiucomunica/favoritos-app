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
