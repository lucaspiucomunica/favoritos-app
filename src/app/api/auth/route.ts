import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  checkPassword,
  signSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.APP_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) {
    return NextResponse.json({ error: 'config ausente' }, { status: 500 });
  }
  if (typeof password !== 'string' || !checkPassword(password, expected)) {
    return NextResponse.json({ error: 'senha inválida' }, { status: 401 });
  }
  const exp = Date.now() + SESSION_TTL_MS;
  const token = await signSession(secret, exp);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
