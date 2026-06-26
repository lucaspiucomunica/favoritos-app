import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  checkPassword,
  constantTimeEqual,
} from '../../src/lib/auth';

const SECRET = 'segredo-de-teste';

describe('constantTimeEqual', () => {
  it('true para iguais', () => expect(constantTimeEqual('abc', 'abc')).toBe(true));
  it('false para diferentes', () => expect(constantTimeEqual('abc', 'abd')).toBe(false));
  it('false para tamanhos diferentes', () => expect(constantTimeEqual('a', 'ab')).toBe(false));
});

describe('sessão', () => {
  it('verifica um token válido não expirado', async () => {
    const now = 1_000_000;
    const token = await signSession(SECRET, now + 10_000);
    expect(await verifySession(SECRET, token, now)).toBe(true);
  });
  it('rejeita token expirado', async () => {
    const token = await signSession(SECRET, 500);
    expect(await verifySession(SECRET, token, 1_000)).toBe(false);
  });
  it('rejeita assinatura adulterada', async () => {
    const token = await signSession(SECRET, 10_000);
    const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
    expect(await verifySession(SECRET, tampered, 0)).toBe(false);
  });
  it('rejeita token undefined', async () => {
    expect(await verifySession(SECRET, undefined, 0)).toBe(false);
  });
});

describe('checkPassword', () => {
  it('aceita senha correta', () => expect(checkPassword('s3nha', 's3nha')).toBe(true));
  it('rejeita senha errada', () => expect(checkPassword('x', 's3nha')).toBe(false));
});
