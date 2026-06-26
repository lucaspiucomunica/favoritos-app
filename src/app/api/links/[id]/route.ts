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
