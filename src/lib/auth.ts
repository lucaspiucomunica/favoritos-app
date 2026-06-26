export const SESSION_COOKIE = 'fav_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signSession(secret: string, expMs: number): Promise<string> {
  const payload = String(expMs);
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySession(
  secret: string,
  token: string | undefined,
  nowMs: number,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(secret, payload);
  if (!constantTimeEqual(sig, expected)) return false;
  const expMs = Number(payload);
  if (!Number.isFinite(expMs)) return false;
  return nowMs < expMs;
}

export function checkPassword(input: string, expected: string): boolean {
  return constantTimeEqual(input, expected);
}
