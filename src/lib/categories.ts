import { sql } from './db';
import type { Category } from './types';

export async function listCategories(): Promise<Category[]> {
  return (await sql`
    SELECT id, name, created_at FROM categories ORDER BY name ASC
  `) as Category[];
}

export async function categoryNames(): Promise<string[]> {
  const rows = (await sql`SELECT name FROM categories ORDER BY name ASC`) as {
    name: string;
  }[];
  return rows.map((r) => r.name);
}

export async function createCategory(name: string): Promise<Category> {
  const rows = (await sql`
    INSERT INTO categories (name) VALUES (${name})
    RETURNING id, name, created_at
  `) as Category[];
  return rows[0];
}
