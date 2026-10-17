import test from 'node:test';
import assert from 'node:assert/strict';
import { createCropToCashApiAdapter, CropToCashApiError } from '../src/services/cropToCashAdapter.ts';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('End-to-End API v1 Adapter Integration with Express Server', async () => {
  // Step 1: Register an authenticated test user
  const regEmail = `farmer.v1.${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      password: 'password123',
      name: 'V1 Test Farmer',
      role: 'farmer',
      villageOrOrg: 'Khandwa Pilot Village',
    }),
  });
  assert.equal(regRes.status, 201, 'User registration must succeed with 201');
  const regData = await regRes.json();
  const token = regData.token;
  assert.ok(token, 'Must return session token');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Step 2: Create a Crop Lot via POST /api/v1/lots
  const createRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cropName: 'Soybean (JS-335)',
      variety: 'Certified FAQ',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-V1/01',
    }),
  });
  assert.equal(createRes.status, 201, 'Lot creation must return 201');
  const createdLot = await createRes.json();
  const lotId = createdLot.id;
  assert.ok(lotId, 'Lot must have persistent ID');
  assert.equal(createdLot.quantityQuintals, 50);

  // Step 3: Instantiate real frontend CropToCashApiAdapter pointing to live server
  const serverFetcher = (path, init) => {
    const fullUrl = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    return fetch(fullUrl, init);
  };
  const adapter = createCropToCashApiAdapter(() => token, serverFetcher);

  // Step 4: Fetch Quotes through Adapter (GET /api/v1/lots/:lotId/quotes)
  const quotes = await adapter.getQuotes(lotId);
  assert.equal(quotes.length, 3, 'Must return 3 quotes: FCI, Mandi, Direct Buyer');
  assert.ok(quotes.every((q) => q.lotId === lotId), 'All quotes must match lotId');
  assert.ok(quotes.every((q) => q.provenance === 'DEMO'), 'Quotes must be marked DEMO');

  const fciQuote = quotes.find((q) => q.option === 'FCI_MSP_REFERENCE');
  const mandiQuote = quotes.find((q) => q.option === 'MANDI');
  const directQuote = quotes.find((q) => q.option === 'DIRECT_BUYER');
  assert.equal(fciQuote?.pricePerQuintal, 2585);
  assert.equal(mandiQuote?.pricePerQuintal, 2300);
  assert.equal(directQuote?.pricePerQuintal, 2350);

  // Step 5: Execute Deterministic Comparison through Adapter (POST /api/v1/lots/:lotId/comparisons)
  const comparison = await adapter.recordComparison(lotId, 50, {
    fciCosts: 2500,
    mandiCosts: 4000,
    directCosts: 4000,
    extraTripCost: 1000,
  });

  assert.equal(comparison.lotId, lotId);
  assert.equal(comparison.calculationVersion, 'v2.0-deterministic');
  assert.deepEqual(
    comparison.estimates.map((e) => [e.option, e.net]),
    [
      ['FCI_MSP_REFERENCE', 126750],
      ['MANDI', 111000],
      ['DIRECT_BUYER', 113500],
    ],
    'Must exactly match 50-quintal net calculation fixtures'
  );
  assert.equal(comparison.downsideNet, 112500, 'Downside fallback must be 112500');
  assert.equal(comparison.event.type, 'COMPARISON');
  assert.equal(comparison.event.lotId, lotId);

  // Step 6: Append Readiness Event through Adapter (POST /api/v1/lots/:lotId/readiness)
  const readinessEvent = await adapter.appendEvent({
    lotId,
    type: 'READINESS',
    source: 'VERIFIED',
    verification: 'OFFICIAL_DOCUMENTS',
    summary: 'Bank account and land records verified.',
    payload: {
      readinessId: 'bankAccount',
      ready: true,
    },
  });
  assert.equal(readinessEvent.type, 'READINESS');
  assert.equal(readinessEvent.payload.ready, true);

  // Step 7: Append Procurement Attempt through Adapter (POST /api/v1/lots/:lotId/procurement-attempts)
  const procurementEvent = await adapter.appendEvent({
    lotId,
    type: 'PROCUREMENT',
    source: 'DEMO',
    verification: 'CENTRE_VERIFIED',
    summary: 'Visited Khandwa FCI depot.',
    payload: {
      outcome: 'VISITED',
      centreName: 'Khandwa FCI Depot',
    },
  });
  assert.equal(procurementEvent.type, 'PROCUREMENT');

  // Step 8: Append Sale Record through Adapter (POST /api/v1/lots/:lotId/sales)
  const saleEvent = await adapter.appendEvent({
    lotId,
    type: 'SALE',
    source: 'DEMO',
    verification: 'CONTRACT_SETTLED',
    summary: 'Direct institutional sale finalized.',
    payload: {
      buyerName: 'ITC Choupal Sagar',
      acceptedQty: 50,
      netAmount: 113500,
      paymentStatus: 'FIRST_INSTALLMENT_PAID',
    },
  });
  assert.equal(saleEvent.type, 'SALE');

  // Step 9: Get Snapshot through Adapter (GET /api/v1/lots/:lotId/ledger)
  const snapshot = await adapter.getSnapshot(lotId);
  assert.equal(snapshot.lotId, lotId);
  assert.equal(snapshot.procurementState, 'VISITED');
  assert.ok(snapshot.events.length >= 4, 'Must contain init, comparison, readiness, procurement, and sale events');
  const bankItem = snapshot.readiness.find((r) => r.id === 'bankAccount');
  assert.equal(bankItem?.ready, true, 'Readiness state must be reflected in snapshot');

  // Step 10: Validation Rejection Test
  await assert.rejects(
    async () => {
      await adapter.recordComparison(lotId, -10, {
        fciCosts: 2500,
        mandiCosts: 4000,
        directCosts: 4000,
        extraTripCost: 1000,
      });
    },
    (err) => err instanceof CropToCashApiError && err.status === 422,
    'Negative quantity must be rejected with 422'
  );

  // Step 11: Authorization & Ownership Isolation Test
  const otherUserRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `other.farmer.${Date.now()}@example.com`,
      password: 'password123',
      name: 'Other Farmer',
      role: 'farmer',
      villageOrOrg: 'Other Village',
    }),
  });
  const otherUserData = await otherUserRes.json();
  const unauthorizedAdapter = createCropToCashApiAdapter(
    () => otherUserData.token,
    serverFetcher
  );

  await assert.rejects(
    async () => {
      await unauthorizedAdapter.getSnapshot(lotId);
    },
    (err) => err instanceof CropToCashApiError && err.status === 403,
    'Non-owner must be rejected with 403 Forbidden'
  );

  // Step 12: Image Screening Endpoint (POST /api/v1/lots/:lotId/screenings)
  const screenRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}/screenings`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      imageFormat: 'jpeg',
      imageSizeBytes: 350000,
      cropDeclared: 'Soybean',
    }),
  });
  assert.equal(screenRes.status, 200, 'Screening must return 200');
  const screening = await screenRes.json();
  assert.equal(screening.isMockOrDemo, true, 'Screening must be clearly marked demo');
  assert.equal(screening.calibratedConfidence, false, 'Uncalibrated confidence must be false');
  assert.ok(
    screening.explanation.safeExpertReferral.includes('KVK') ||
    screening.explanation.safeExpertReferral.includes('Krishi Vigyan Kendra'),
    'Must advise consultation with KVK'
  );
  assert.ok(
    !screening.explanation.safeExpertReferral.toLowerCase().includes('spray') &&
    !screening.explanation.safeExpertReferral.toLowerCase().includes('chemical'),
    'Must NOT prescribe synthetic pesticides'
  );
});
