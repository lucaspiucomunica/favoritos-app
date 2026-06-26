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
  } catch (err) {
    // 23505 = unique_violation no Postgres (nome de categoria duplicado).
    // Qualquer outro erro (ex.: conexão) não deve se mascarar como 409.
    const code =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === '23505') {
      return NextResponse.json({ error: 'categoria já existe' }, { status: 409 });
    }
    return NextResponse.json({ error: 'erro ao criar categoria' }, { status: 500 });
  }
}
