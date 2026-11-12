import 'server-only';
import { Pool } from 'pg';

// Server-side Postgres (Supabase pooler, transaction mode). Bypasses RLS, so every caller checks permissions itself.
const g = globalThis as unknown as { _pghubPool?: Pool };
export const db = g._pghubPool ?? (g._pghubPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10_000 }));

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query(sql, params)).rows as T[];
}
export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  return ((await db.query(sql, params)).rows[0] as T) ?? null;
}
