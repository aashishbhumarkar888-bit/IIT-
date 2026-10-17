import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);
const secondBaseUrl = process.env.SECOND_BASE_URL?.replace(/\/+$/, '');
const sharedAccountEmail = process.env.TEST_AUTH_EMAIL;
const sharedAccountPassword = process.env.TEST_AUTH_PASSWORD;

let token;
let email;

before(async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200, 'app server must be reachable');
});

after(async () => {
  if (token) {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test('registration creates a session that can be restored and used for crop creation', async () => {
  email = `scale-test-${randomUUID()}@example.test`;
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Scaling Test Farmer',
      email,
      password: 'temporary-test-password',
      role: 'farmer',
      villageOrOrg: 'Test Village',
    }),
  });

  assert.equal(registration.status, 201);
  const registrationData = await registration.json();
  assert.ok(registrationData.token);
  assert.equal(registrationData.user.email, email);
  token = registrationData.token;

  const session = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(session.status, 200);
  const sessionData = await session.json();
  assert.equal(sessionData.authenticated, true);
  assert.equal(sessionData.user.email, email);

  const crop = await fetch(`${baseUrl}/api/profile/crops`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cropName: 'Test Wheat',
      variety: 'Test Variety',
      quantityQuintals: 12,
    }),
  });
  assert.equal(crop.status, 201);
  const cropData = await crop.json();
  assert.equal(cropData.lot.cropName, 'Test Wheat');
  assert.equal(cropData.personalLots.length, 1);
});

test('logout clears the client session while copied tokens remain valid only until expiry', async () => {
  assert.ok(token, 'registration test must create a session first');
  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logout.status, 200);

  const session = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).authenticated, true);
  token = undefined;
});

test(
  'a signed token works on another instance using the shared secret',
  {
    skip:
      !secondBaseUrl || !sharedAccountEmail || !sharedAccountPassword
        ? 'Set SECOND_BASE_URL, TEST_AUTH_EMAIL, and TEST_AUTH_PASSWORD.'
        : false,
  },
  async () => {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sharedAccountEmail,
        password: sharedAccountPassword,
      }),
    });
    assert.equal(login.status, 200);
    const loginData = await login.json();

    const session = await fetch(`${secondBaseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.email, sharedAccountEmail);
  }
);
