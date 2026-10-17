import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  createCropToCashApiAdapter,
  CropToCashApiError,
} from '../src/services/cropToCashAdapter.ts';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);

function createHttpFetcher(baseUrl) {
  return (input, init) => {
    const path = String(input);
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    return fetch(url, init);
  };
}

test('API v1 Integration: 12-Step Live HTTP End-to-End Verification via createCropToCashApiAdapter', async () => {
  // Step 1: Register Farmer A and obtain signed session token
  const farmerAEmail = `farmer.v1.a.${randomUUID()}@example.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerAEmail,
      password: 'password123',
      name: 'Kisan V1 Farmer A',
      role: 'farmer',
      villageOrOrg: 'Khandwa Hub',
    }),
  });
  assert.equal(regARes.status, 201, 'Farmer A registration must return 201');
  const regAData = await regARes.json();
  const tokenA = regAData.token;
  assert.ok(tokenA, 'Must issue signed session token for Farmer A');

  const authHeadersA = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenA}`,
  };

  // Step 2: Create a 50-qtl crop lot via POST /api/v1/lots
  const createLotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      cropName: 'Sharbati Wheat',
      variety: 'HI-1544 FAQ',
      grade: 'Grade A',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Survey-89/B',
    }),
  });
  assert.equal(createLotRes.status, 201, 'POST /api/v1/lots must return 201');
  const createdLot = await createLotRes.json();
  const lotId = createdLot.id;
  assert.ok(lotId, 'Created lot must have a persistent ID');
  assert.equal(createdLot.quantityQuintals, 50);

  // Step 3: Verify GET /api/v1/lots and GET /api/v1/lots/:lotId
  const listLotsRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    headers: authHeadersA,
  });
  assert.equal(listLotsRes.status, 200);
  const ownedLots = await listLotsRes.json();
  assert.ok(
    Array.isArray(ownedLots) && ownedLots.some((item) => item.id === lotId),
    'GET /api/v1/lots must include newly created lot'
  );

  const singleLotRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}`, {
    headers: authHeadersA,
  });
  assert.equal(singleLotRes.status, 200);
  const singleLot = await singleLotRes.json();
  assert.equal(singleLot.id, lotId);

  // Instantiate the real frontend typed adapter over live HTTP
  const adapterA = createCropToCashApiAdapter(
    () => tokenA,
    createHttpFetcher(BASE_URL)
  );

  // Step 4: Fetch quotes via adapter (GET /api/v1/lots/:lotId/quotes)
  const quotes = await adapterA.getQuotes(lotId);
  assert.equal(quotes.length, 3, 'Must return 3 selling quotes');
  assert.ok(quotes.every((q) => q.lotId === lotId));
  assert.ok(quotes.every((q) => q.provenance === 'DEMO'));

  // Step 5: Record 50-qtl comparison via adapter (POST /api/v1/lots/:lotId/comparisons)
  const comparison = await adapterA.recordComparison(lotId, 50, {
    fciCosts: 2500,
    mandiCosts: 4000,
    directCosts: 4000,
    extraTripCost: 1000,
  });
  assert.equal(comparison.lotId, lotId);
  assert.deepEqual(
    comparison.estimates.map(({ option, net }) => [option, net]),
    [
      ['FCI_MSP_REFERENCE', 126750],
      ['MANDI', 111000],
      ['DIRECT_BUYER', 113500],
    ]
  );
  assert.equal(comparison.downsideNet, 112500);
  assert.equal(comparison.event.type, 'COMPARISON');

  // Step 6: Record boolean readiness via adapter (POST /api/v1/lots/:lotId/readiness)
  const readinessEvent = await adapterA.appendEvent({
    lotId,
    type: 'READINESS',
    source: 'MANUAL',
    verification: 'USER_REPORTED',
    summary: 'registration readiness marked yes.',
    payload: {
      readinessId: 'registration',
      ready: true,
    },
  });
  assert.equal(readinessEvent.type, 'READINESS');
  assert.equal(readinessEvent.lotId, lotId);

  // Step 7: Record procurement attempt via adapter (POST /api/v1/lots/:lotId/procurement-attempts)
  const procurementEvent = await adapterA.appendEvent({
    lotId,
    type: 'PROCUREMENT',
    source: 'MANUAL',
    verification: 'FARMER_REPORTED',
    summary: 'Procurement attempt marked ACCEPTED.',
    payload: {
      state: 'ACCEPTED',
      reason: 'Moisture verified at 11.4%',
    },
  });
  assert.equal(procurementEvent.type, 'PROCUREMENT');
  assert.equal(procurementEvent.payload.state, 'ACCEPTED');

  // Step 8: Record sale via adapter (POST /api/v1/lots/:lotId/sales)
  const saleEvent = await adapterA.appendEvent({
    lotId,
    type: 'SALE',
    source: 'MANUAL',
    verification: 'FARMER_REPORTED',
    summary: 'Sale reported: 50 qtl at ₹2,350/qtl; actual net ₹1,13,500.',
    payload: {
      quantityQtl: 50,
      agreedPricePerQtl: 2350,
      deductions: 4000,
      actualNet: 113500,
      paymentStatus: 'PAID',
      differenceFromEstimate: 0,
    },
  });
  assert.equal(saleEvent.type, 'SALE');
  assert.equal(saleEvent.payload.actualNet, 113500);

  // Step 9: Retrieve full ledger snapshot via adapter (GET /api/v1/lots/:lotId/ledger)
  const snapshot = await adapterA.getSnapshot(lotId);
  assert.equal(snapshot.lotId, lotId);
  assert.equal(snapshot.procurementState, 'ACCEPTED');
  assert.equal(
    snapshot.readiness.find((item) => item.id === 'registration')?.ready,
    true
  );
  assert.ok(
    snapshot.events.length >= 5,
    'Ledger must contain initial, comparison, readiness, procurement, and sale events'
  );

  // Step 10: Verify pre-seeded default UI lot KS-MP-2025-089 works with adapter
  const defaultSnapshot = await adapterA.getSnapshot('KS-MP-2025-089');
  assert.equal(defaultSnapshot.lotId, 'KS-MP-2025-089');

  // Step 11: Verify ownership isolation (Farmer B cannot read or modify Farmer A's lot)
  const farmerBEmail = `farmer.v1.b.${randomUUID()}@example.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerBEmail,
      password: 'password123',
      name: 'Kisan V1 Farmer B',
      role: 'farmer',
      villageOrOrg: 'Indore Hub',
    }),
  });
  assert.equal(regBRes.status, 201);
  const { token: tokenB } = await regBRes.json();
  const adapterB = createCropToCashApiAdapter(
    () => tokenB,
    createHttpFetcher(BASE_URL)
  );

  await assert.rejects(
    adapterB.getSnapshot(lotId),
    (err) => err instanceof CropToCashApiError && err.status === 403,
    'Farmer B must receive 403 Forbidden when accessing Farmer A lot'
  );

  // Step 12: Verify POST /api/v1/lots/:lotId/screenings rejects >10MB and returns safe KVK advice on valid payload
  const oversizedRes = await fetch(
    `${BASE_URL}/api/v1/lots/${lotId}/screenings`,
    {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        imageFormat: 'jpeg',
        imageSizeBytes: 12 * 1024 * 1024,
        cropDeclared: 'Wheat',
      }),
    }
  );
  assert.equal(oversizedRes.status, 422, 'Oversized >10MB image must return 422');

  const validScreenRes = await fetch(
    `${BASE_URL}/api/v1/lots/${lotId}/screenings`,
    {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        imageFormat: 'jpeg',
        imageSizeBytes: 350 * 1024,
        cropDeclared: 'Wheat',
      }),
    }
  );
  assert.equal(validScreenRes.status, 201);
  const validScreening = await validScreenRes.json();
  assert.equal(validScreening.isMockOrDemo, true);
  assert.equal(validScreening.calibratedConfidence, false);
  assert.ok(
    validScreening.explanation.safeExpertReferral.includes(
      'Krishi Vigyan Kendra (KVK)'
    )
  );
});
