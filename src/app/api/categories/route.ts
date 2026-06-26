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
