import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getServerSessionExpiry } from '../src/sessionToken.ts';

function makeToken(expiresAt) {
  const encodedClaims = Buffer.from(JSON.stringify({ expiresAt })).toString(
    'base64url'
  );
  return `${encodedClaims}.${'a'.repeat(64)}`;
}

test('client reads the signed session expiry for the automatic sign-out screen flow', () => {
  const expiresAt = 1_800_000_000_000;
  assert.equal(getServerSessionExpiry(makeToken(expiresAt)), expiresAt);
});

test('client rejects malformed session tokens when scheduling sign-out', () => {
  assert.equal(getServerSessionExpiry('not-a-token'), null);
  assert.equal(
    getServerSessionExpiry(`${Buffer.from('{}').toString('base64url')}.bad`),
    null
  );
  assert.equal(getServerSessionExpiry(makeToken('not-a-timestamp')), null);
});
