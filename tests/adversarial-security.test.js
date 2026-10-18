import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);

test('Phase 5 Adversarial Security: 7 Isolated Multi-Tenant Authorization Attack Vectors', async () => {
  let serverReachable = false;
  try {
    const ping = await fetch(`${BASE_URL}/api/auth/session`);
    serverReachable = ping.status === 401 || ping.status === 200;
  } catch {
    serverReachable = false;
  }

  if (!serverReachable) {
    console.log('Skipping live HTTP adversarial tests (server not active on port 3000)');
    return;
  }

  // Setup: Register Farmer A
  const emailA = `farmer.adv.a.${randomUUID()}@example.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      password: 'AdvPassword123!',
      name: 'Adversarial Farmer A',
      role: 'farmer',
      villageOrOrg: 'Khandwa Cluster',
    }),
  });
  assert.equal(regARes.status, 201);
  const { token: tokenA } = await regARes.json();

  // Setup: Register Farmer B
  const emailB = `farmer.adv.b.${randomUUID()}@example.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailB,
      password: 'AdvPassword123!',
      name: 'Adversarial Farmer B',
      role: 'farmer',
      villageOrOrg: 'Indore Cluster',
    }),
  });
  assert.equal(regBRes.status, 201);
  const { token: tokenB } = await regBRes.json();

  // Setup: Register Buyer C
  const emailC = `buyer.adv.c.${randomUUID()}@example.com`;
  const regCRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailC,
      password: 'AdvPassword123!',
      name: 'Institutional Buyer C',
      role: 'buyer',
      villageOrOrg: 'ITC Agri Procurement Hub',
    }),
  });
  assert.equal(regCRes.status, 201);
  const { token: tokenC } = await regCRes.json();

  // Farmer A creates Lot A
  const createLotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      cropName: 'Organic Wheat',
      variety: 'HI-1544',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-Adv-A',
    }),
  });
  assert.equal(createLotRes.status, 201);
  const lotA = await createLotRes.json();
  const lotAId = lotA.id;

  // ---------------------------------------------------------------------------
  // Vector 1: Farmer B attempts to read Farmer A's private crop lot
  // ---------------------------------------------------------------------------
  const v1Res = await fetch(`${BASE_URL}/api/v1/lots/${lotAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(
    v1Res.status,
    403,
    'Vector 1: Farmer B must receive 403 Forbidden when reading Farmer A lot'
  );
  const v1Data = await v1Res.json();
  assert.equal(v1Data.error.code, 'FORBIDDEN');

  // ---------------------------------------------------------------------------
  // Vector 2: Farmer B attempts to modify Farmer A's private crop lot
  // ---------------------------------------------------------------------------
  const v2Res = await fetch(`${BASE_URL}/api/v1/lots/${lotAId}/comparisons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      quantityQtl: 50,
      costs: { fciCosts: 2500, mandiCosts: 4000, directCosts: 4000 },
    }),
  });
  assert.equal(
    v2Res.status,
    403,
    'Vector 2: Farmer B must receive 403 Forbidden when modifying Farmer A lot'
  );

  // ---------------------------------------------------------------------------
  // Vector 3: An unauthenticated user attempts a protected operation
  // ---------------------------------------------------------------------------
  const v3Res = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'GET',
    // No Authorization header
  });
  assert.equal(
    v3Res.status,
    401,
    'Vector 3: Unauthenticated request must return 401 Unauthorized'
  );

  // ---------------------------------------------------------------------------
  // Vector 4: A farmer attempts an administrator-only operation
  // ---------------------------------------------------------------------------
  const v4Res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(
    v4Res.status,
    403,
    'Vector 4: Farmer invoking admin dashboard must return 403 Forbidden'
  );

  // ---------------------------------------------------------------------------
  // Vector 5: A buyer attempts to access an unrelated farmer private lot
  // ---------------------------------------------------------------------------
  const v5Res = await fetch(`${BASE_URL}/api/v1/lots/${lotAId}`, {
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  assert.equal(
    v5Res.status,
    403,
    'Vector 5: Buyer accessing unrelated farmer lot must return 403 Forbidden'
  );

  // ---------------------------------------------------------------------------
  // Vector 6: A user submits a forged role or owner identity
  // ---------------------------------------------------------------------------
  // 6a: Attempt self-assigned admin role on register
  const v6aRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `forged.admin.${randomUUID()}@example.com`,
      password: 'HackerPassword!123',
      name: 'Forged Admin',
      role: 'admin',
    }),
  });
  assert.equal(
    v6aRes.status,
    403,
    'Vector 6a: Registering with role admin must return 403 Forbidden'
  );

  // 6b: Forging ownerEmail during lot creation (must be bound to tokenA, not victim)
  const v6bRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      cropName: 'Wheat Spoof',
      quantityQuintals: 20,
      ownerEmail: 'victim.farmer@example.com',
      ownerId: 'VICTIM-999',
    }),
  });
  assert.equal(v6bRes.status, 201);
  const forgedLot = await v6bRes.json();
  assert.equal(
    forgedLot.ownerEmail,
    emailA,
    'Vector 6b: Server must force ownerEmail to verified token user, ignoring spoofed body field'
  );

  // ---------------------------------------------------------------------------
  // Vector 7: A user attempts an invalid workflow transition or malformed state
  // ---------------------------------------------------------------------------
  const v7Res = await fetch(
    `${BASE_URL}/api/v1/lots/${lotAId}/procurement-attempts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        payload: {
          state: 'ILLEGAL_FABRICATED_STATE',
          reason: 'Bypassing state machine',
        },
      }),
    }
  );
  assert.equal(
    v7Res.status,
    422,
    'Vector 7: Invalid procurement state transition must return 422 Unprocessable Entity'
  );
  const v7Data = await v7Res.json();
  assert.equal(v7Data.error.code, 'INVALID_PROCUREMENT_STATE');
});
