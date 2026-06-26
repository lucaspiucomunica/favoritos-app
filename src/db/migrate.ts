import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

// O Next.js carrega .env.local automaticamente, mas este script roda via tsx,
// fora do Next — então carregamos as variáveis manualmente antes de lê-las.
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL não definida. Verifique se o arquivo .env.local existe na raiz ' +
        'do projeto, está nomeado exatamente ".env.local" (sem .txt no final) e contém ' +
        'a linha DATABASE_URL=postgresql://...',
    );
  }
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
