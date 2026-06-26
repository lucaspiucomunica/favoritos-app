import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const sql = neon(url);
  const ddl = readFileSync(join(process.cwd(), 'src/db/schema.sql'), 'utf8');
  // neon() HTTP executa um statement por chamada; dividimos por ';'
  const statements = ddl.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log(`Migração aplicada: ${statements.length} statements.`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
