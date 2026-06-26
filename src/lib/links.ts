import { sql } from './db';
import type { Link, AiStatus } from './types';
import type { UpdateLinkInput } from './schema';

export async function insertLink(row: {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  category_id: string | null;
  tags: string[];
  ai_status: AiStatus;
  ai_error: string | null;
}): Promise<Link> {
  const rows = (await sql`
    INSERT INTO links (url, title, description, image_url, site_name,
                       category_id, tags, ai_status, ai_error)
    VALUES (${row.url}, ${row.title}, ${row.description}, ${row.image_url},
            ${row.site_name}, ${row.category_id}, ${row.tags}, ${row.ai_status},
            ${row.ai_error})
    RETURNING *
  `) as Link[];
  return rows[0];
}

export async function listLinks(filter: {
  q?: string;
  categoryId?: string;
  tag?: string;
  favorite?: boolean;
  unread?: boolean;
}): Promise<Link[]> {
  // query() com placeholders numerados para WHERE dinâmico
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.q) {
    params.push(`%${filter.q}%`);
    const p = `$${params.length}`;
    where.push(`(title ILIKE ${p} OR description ILIKE ${p} OR url ILIKE ${p})`);
  }
  if (filter.categoryId) {
    params.push(filter.categoryId);
    where.push(`category_id = $${params.length}`);
  }
  if (filter.tag) {
    params.push(filter.tag);
    where.push(`$${params.length} = ANY(tags)`);
  }
  if (filter.favorite) where.push(`is_favorite = true`);
  if (filter.unread) where.push(`is_read = false`);

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await sql.query(
    `SELECT * FROM links ${clause} ORDER BY created_at DESC`,
    params,
  );
  return rows as Link[];
}

export async function getLink(id: string): Promise<Link | null> {
  const rows = (await sql`SELECT * FROM links WHERE id = ${id}`) as Link[];
  return rows[0] ?? null;
}

export async function updateLink(
  id: string,
  patch: UpdateLinkInput,
): Promise<Link | null> {
  // COALESCE só atualiza campos presentes no patch; um valor null/undefined
  // mantém o valor atual. Por isso NÃO use updateLink para LIMPAR a categoria
  // (setar category_id = null) — use setCategory(), que faz a atribuição direta.
  const rows = (await sql`
    UPDATE links SET
      category_id = COALESCE(${patch.category_id ?? null}, category_id),
      tags        = COALESCE(${patch.tags ?? null}, tags),
      is_read     = COALESCE(${patch.is_read ?? null}, is_read),
      is_favorite = COALESCE(${patch.is_favorite ?? null}, is_favorite),
      updated_at  = now()
    WHERE id = ${id}
    RETURNING *
  `) as Link[];
  return rows[0] ?? null;
}

export async function setClassification(
  id: string,
  c: { category_id: string | null; tags: string[]; ai_status: AiStatus; ai_error: string | null },
): Promise<Link | null> {
  const rows = (await sql`
    UPDATE links SET
      category_id = ${c.category_id}, tags = ${c.tags},
      ai_status = ${c.ai_status}, ai_error = ${c.ai_error}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `) as Link[];
  return rows[0] ?? null;
}

export async function deleteLink(id: string): Promise<boolean> {
  const rows = (await sql`DELETE FROM links WHERE id = ${id} RETURNING id`) as {
    id: string;
  }[];
  return rows.length > 0;
}

export async function allTags(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT unnest(tags) AS tag FROM links ORDER BY 1 ASC
  `) as { tag: string }[];
  return rows.map((r) => r.tag);
}

export async function setCategory(
  id: string,
  categoryId: string | null,
): Promise<Link | null> {
  const rows = (await sql`
    UPDATE links SET category_id = ${categoryId}, updated_at = now()
    WHERE id = ${id} RETURNING *
  `) as Link[];
  return rows[0] ?? null;
}
