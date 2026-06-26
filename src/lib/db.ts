import { neon } from '@neondatabase/serverless';

// neon() does not open a connection at creation — only when a query runs.
// A placeholder keeps `next build` working without DATABASE_URL set.
export const sql = neon(
  process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/placeholder',
);
