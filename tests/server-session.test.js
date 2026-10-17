import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSignedToken,
  SESSION_TTL_MS,
  verifySignedToken,
} from '../serverSession.ts';

const secret = 'test-session-secret-with-at-least-32-characters';

test('signed tokens verify independently without server-side session state', () => {
  const now = 1_800_000_000_000;
  const token = createSignedToken('farmer.name@example.test', secret, now);
  const claims = verifySignedToken(token, secret, now);

  assert.ok(claims);
  assert.match(claims.tokenId, /^[a-f0-9]{48}$/);
  assert.equal(claims.email, 'farmer.name@example.test');
  assert.equal(claims.issuedAt, now);
  assert.equal(claims.expiresAt, now + SESSION_TTL_MS);
});

test('signed tokens expire after fifteen minutes', () => {
  const now = 1_800_000_000_000;
  const token = createSignedToken('farmer@example.test', secret, now);

  assert.ok(verifySignedToken(token, secret, now + SESSION_TTL_MS - 1));
  assert.equal(verifySignedToken(token, secret, now + SESSION_TTL_MS), null);
});

test('signed tokens reject tampering, a different secret, and future issuance', () => {
  const now = 1_800_000_000_000;
  const token = createSignedToken('farmer@example.test', secret, now);
  const [payload, signature] = token.split('.');
  const changedFirstDigit = signature[0] === '0' ? '1' : '0';
  const tamperedToken = `${payload}.${changedFirstDigit}${signature.slice(1)}`;

  assert.equal(verifySignedToken(tamperedToken, secret, now), null);
  assert.equal(verifySignedToken(token, `${secret}-other`, now), null);
  assert.equal(verifySignedToken(token, secret, now - 1), null);
});
