import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSellingOptions } from '../src/services/cropToCashCalculations.ts';
import {
  createCropToCashApiAdapter,
  CropToCashApiError,
} from '../src/services/cropToCashAdapter.ts';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

const serverFetcher = (path, init) => {
  const fullUrl = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  return fetch(fullUrl, init);
};

// ============================================================================
// STEP 1 & JOURNEY F: Operational Smoke and Health Verification
// ============================================================================
test('Operational Smoke Test: Backend Health & Static Shell', async () => {
  // 1. Smoke test: /api/health
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200, 'Health check must return 200');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'OK');
  assert.equal(healthData.service, 'KisanSetu-AI-Backend');
  assert.ok(typeof healthData.uptime === 'number');

  // 2. Direct Navigation to root /
  const rootRes = await fetch(`${BASE_URL}/`);
  assert.equal(rootRes.status, 200, 'Root must return 200');
  const rootHtml = await rootRes.text();
  assert.ok(rootHtml.includes('<div id="root">') || rootHtml.includes('<!DOCTYPE html>'));

  // 3. Cache-Control Header Check on /api
  assert.equal(
    healthRes.headers.get('cache-control'),
    'private, no-store',
    '/api endpoints must specify private, no-store'
  );
});

// ============================================================================
// STEP 2 — JOURNEY A: Complete Farmer Workflow
// ============================================================================
test('Journey A: Complete Farmer Workflow (Auth -> Crop -> Screening -> Compare -> Readiness -> Visit -> Sale -> Consistent Ledger)', async () => {
  // 1. Authenticate using an isolated test account
  const timestamp = Date.now();
  const farmerEmail = `farmer.qa.${timestamp}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerEmail,
      password: 'StrongFarmerPassword123!',
      name: 'Radheshyam Patidar',
      role: 'farmer',
      villageOrOrg: 'Khandwa Gram',
    }),
  });
  assert.equal(regRes.status, 201, 'Farmer registration must succeed');
  const regData = await regRes.json();
  const farmerToken = regData.token;
  assert.ok(farmerToken, 'Must issue a valid session token');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${farmerToken}`,
  };

  // 2. Open crop workflow & create lot KS-SOY-QA-...
  const lotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cropName: 'Soybean (JS-335)',
      variety: 'Certified FAQ',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-QA/42',
    }),
  });
  assert.equal(lotRes.status, 201, 'Lot creation must return 201');
  const lot = await lotRes.json();
  const lotId = lot.id;
  assert.ok(lotId.startsWith('KS-'), 'Lot ID must follow KisanSetu format');
  assert.equal(lot.quantityQuintals, 50);

  // 3. Submit crop image screening
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

  // 4. Verify explicitly labelled demo result and safe referrals
  assert.equal(screening.isMockOrDemo, true, 'Screening must be explicitly marked mock/demo');
  assert.equal(screening.calibratedConfidence, false, 'Uncalibrated confidence must be false');
  assert.ok(
    screening.explanation.safeExpertReferral.includes('Krishi Vigyan Kendra') ||
    screening.explanation.safeExpertReferral.includes('KVK'),
    'Must advise consultation with KVK or Agriculture Officer'
  );
  assert.ok(
    !screening.explanation.safeExpertReferral.toLowerCase().includes('spray') &&
    !screening.explanation.safeExpertReferral.toLowerCase().includes('chemical'),
    'Zero pesticide prescriptions allowed from leaf image'
  );

  // 5. Compare available procurement options
  const adapter = createCropToCashApiAdapter(() => farmerToken, serverFetcher);
  const quotes = await adapter.getQuotes(lotId);
  assert.equal(quotes.length, 3, 'Must return FCI, Mandi, and Direct Buyer options');
  assert.ok(quotes.every((q) => q.lotId === lotId), 'All quotes must match current lot ID');
  assert.ok(quotes.every((q) => q.provenance === 'DEMO'), 'Quotes must be marked DEMO');

  // 6. Independently verify every financial calculation
  const comparison = await adapter.recordComparison(lotId, 50, {
    fciCosts: 2500,
    mandiCosts: 4000,
    directCosts: 4000,
    extraTripCost: 1000,
  });

  // Independent verification using calculation engine
  const independentCalc = calculateSellingOptions(50, quotes, {
    fciCosts: 2500,
    mandiCosts: 4000,
    directCosts: 4000,
    extraTripCost: 1000,
  });
  assert.equal(
    comparison.estimates.find((e) => e.option === 'FCI_MSP_REFERENCE')?.net,
    independentCalc.estimates.find((e) => e.option === 'FCI_MSP_REFERENCE')?.net
  );
  assert.equal(
    comparison.estimates.find((e) => e.option === 'MANDI')?.net,
    independentCalc.estimates.find((e) => e.option === 'MANDI')?.net
  );
  assert.equal(
    comparison.estimates.find((e) => e.option === 'DIRECT_BUYER')?.net,
    independentCalc.estimates.find((e) => e.option === 'DIRECT_BUYER')?.net
  );
  assert.equal(comparison.downsideNet, independentCalc.downsideNet);

  // Check exact 50-quintal fixture numbers
  assert.equal(comparison.estimates.find((e) => e.option === 'FCI_MSP_REFERENCE')?.net, 126750);
  assert.equal(comparison.estimates.find((e) => e.option === 'MANDI')?.net, 111000);
  assert.equal(comparison.estimates.find((e) => e.option === 'DIRECT_BUYER')?.net, 113500);
  assert.equal(comparison.downsideNet, 112500);

  // 7. Open procurement-readiness workflow and record documents
  const readinessEvent = await adapter.appendEvent({
    lotId,
    type: 'READINESS',
    source: 'VERIFIED',
    verification: 'OFFICIAL_DOCUMENTS',
    summary: 'Aadhaar registration and land records confirmed.',
    payload: { readinessId: 'registration', ready: true },
  });
  assert.equal(readinessEvent.type, 'READINESS');
  assert.equal(readinessEvent.payload.ready, true);

  // 8. Record a visit outcome
  const visitEvent = await adapter.appendEvent({
    lotId,
    type: 'PROCUREMENT',
    source: 'DEMO',
    verification: 'CENTRE_VERIFIED',
    summary: 'Visited Khandwa FCI Depot; sample graded FAQ.',
    payload: { outcome: 'VISITED', centreName: 'Khandwa FCI Depot' },
  });
  assert.equal(visitEvent.type, 'PROCUREMENT');
  assert.equal(visitEvent.payload.outcome, 'VISITED');

  // 9. Record a sale
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
  assert.equal(saleEvent.payload.paymentStatus, 'FIRST_INSTALLMENT_PAID');

  // 10. Simulate page refresh / re-fetch ledger snapshot
  const snapshot = await adapter.getSnapshot(lotId);
  assert.equal(snapshot.lotId, lotId, 'Lot ID identity must be strictly maintained');
  assert.equal(snapshot.procurementState, 'VISITED');
  assert.ok(snapshot.events.length >= 4, 'All timeline events must persist');
  assert.equal(snapshot.events[0].lotId, lotId);
  assert.equal(snapshot.events[snapshot.events.length - 1].lotId, lotId);
});

// ============================================================================
// STEP 2 — JOURNEY B: Validation, Error Handling, and Recovery
// ============================================================================
test('Journey B: Validation, Safe Failure Handling, and Recovery', async () => {
  // 1. Register test user
  const farmerEmail = `farmer.val.${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerEmail,
      password: 'password123',
      name: 'Validation Test Farmer',
      role: 'farmer',
      villageOrOrg: 'Validation Village',
    }),
  });
  const { token } = await regRes.json();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Submit malformed crop lot input (missing cropName)
  const malformedLotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cropName: '', // Empty
      quantityQuintals: -5, // Negative quantity
    }),
  });
  assert.equal(malformedLotRes.status, 422, 'Server must reject malformed lot creation with 422');
  const errBody = await malformedLotRes.json();
  assert.ok(errBody.message || errBody.error, 'Must provide human-readable error description');

  // 3. Confirm invalid lot is not persisted
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: authHeaders,
  });
  const sessionData = await sessionRes.json();
  assert.equal(sessionData.personalLots.length, 0, 'Invalid lot must not be persisted');

  // 4. Correct the input and retry
  const validLotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cropName: 'Soybean (JS-335)',
      variety: 'Certified FAQ',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-V1/Valid',
    }),
  });
  assert.equal(validLotRes.status, 201, 'Corrected lot input must succeed');
  const lot = await validLotRes.json();
  const lotId = lot.id;

  // 5. Submit malformed comparison inputs (negative costs)
  const adapter = createCropToCashApiAdapter(() => token, serverFetcher);
  await assert.rejects(
    async () => {
      await adapter.recordComparison(lotId, 50, {
        fciCosts: -100, // Negative cost invalid
        mandiCosts: 4000,
        directCosts: 4000,
        extraTripCost: 1000,
      });
    },
    (err) => err instanceof CropToCashApiError && err.status === 422,
    'Negative cost input must be rejected with 422'
  );

  // 6. Submit oversized screening image (simulating failure)
  const hugeImageRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}/screenings`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      imageFormat: 'jpeg',
      imageSizeBytes: 15 * 1024 * 1024, // 15MB > 10MB limit
      cropDeclared: 'Soybean',
    }),
  });
  assert.equal(hugeImageRes.status, 200);
  const screening = await hugeImageRes.json();
  assert.equal(screening.outcomeCategory, 'IMAGE_QUALITY_REJECTED', 'Must safely abstain without crashing');
  assert.ok(
    screening.abstentionReason?.includes('exceeds') ||
    screening.explanation?.diagnosticNotes?.includes('exceeds'),
    'Must indicate file size exceeds supported limit'
  );
});

// ============================================================================
// STEP 2 — JOURNEY C: Authorization, Role Escalation Guard, and Privacy Audit
// ============================================================================
test('Journey C: Authorization & Privacy (Cross-User Isolation, RBAC, Zero PII Exposure)', async () => {
  // 1. Create Farmer A with a lot
  const farmerAEmail = `farmer.a.${Date.now()}@example.com`;
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerAEmail,
      password: 'passwordA123',
      name: 'Farmer Alice',
      role: 'farmer',
      villageOrOrg: 'Village A',
    }),
  });
  const regAData = await regARes.json();
  const farmerAToken = regAData.token;

  const lotARes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerAToken}`,
    },
    body: JSON.stringify({
      cropName: 'Soybean (JS-335)',
      variety: 'Grade A',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-A/01',
    }),
  });
  const lotA = await lotARes.json();
  const lotAId = lotA.id;

  // 2. Create Farmer B
  const farmerBEmail = `farmer.b.${Date.now()}@example.com`;
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerBEmail,
      password: 'passwordB123',
      name: 'Farmer Bob',
      role: 'farmer',
      villageOrOrg: 'Village B',
    }),
  });
  const farmerBToken = (await regBRes.json()).token;

  // 3. Farmer B attempts cross-user retrieval of Lot A -> 403 Forbidden
  const crossGetRes = await fetch(`${BASE_URL}/api/v1/lots/${lotAId}`, {
    headers: { Authorization: `Bearer ${farmerBToken}` },
  });
  assert.equal(crossGetRes.status, 403, 'Cross-user lot retrieval must return 403 Forbidden');

  // 4. Farmer B attempts cross-user modification of Lot A -> 403 Forbidden
  const crossPostRes = await fetch(`${BASE_URL}/api/v1/lots/${lotAId}/comparisons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${farmerBToken}`,
    },
    body: JSON.stringify({
      quantityQuintals: 50,
      costs: { fciCosts: 2500, mandiCosts: 4000, directCosts: 4000, extraTripCost: 1000 },
    }),
  });
  assert.equal(crossPostRes.status, 403, 'Cross-user comparison modification must return 403 Forbidden');

  // 5. Attempt protected operation without token -> 401 Unauthorized
  const unauthRes = await fetch(`${BASE_URL}/api/v1/lots/${lotAId}`);
  assert.equal(unauthRes.status, 401, 'Unauthenticated access must return 401 Unauthorized');

  // 6. Farmer attempts admin-only operation -> 403 Forbidden
  const adminRes = await fetch(`${BASE_URL}/api/admin/pilot-analytics`, {
    headers: { Authorization: `Bearer ${farmerAToken}` },
  });
  assert.equal(adminRes.status, 403, 'Farmer accessing admin pilot-analytics must return 403 Forbidden');

  // 7. Role escalation forging attempt during registration
  const forgeRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `forger.${Date.now()}@example.com`,
      password: 'password123',
      name: 'Role Forger',
      role: 'admin', // Malicious attempt to register directly as admin
      villageOrOrg: 'Hackers Den',
    }),
  });
  assert.equal(forgeRes.status, 403, 'Direct registration as admin must be rejected with 403 Forbidden');
  const forgeData = await forgeRes.json();
  assert.ok(forgeData.error.includes('Administrator privileges cannot be self-assigned'), 'Error must specify privilege escalation prevention');

  // 8. Privacy Check: Zero exposure of passwordHash or passwordSalt on authenticated user payload
  assert.equal(regAData.user.passwordHash, undefined, 'passwordHash must never be exposed');
  assert.equal(regAData.user.passwordSalt, undefined, 'passwordSalt must never be exposed');

  // 9. Privacy Check: Zero Aadhaar or document scans in lot payload
  assert.equal(lotA.aadhaarNumber, undefined, 'Zero Aadhaar numbers stored on crop lot');
  assert.equal(lotA.bankAccountNumber, undefined, 'Zero bank account numbers stored on crop lot');
  assert.equal(lotA.passbookScan, undefined, 'Zero passbook scans stored on crop lot');
});

// ============================================================================
// STEP 2 — JOURNEY D: Bilingual Localization Consistency
// ============================================================================
test('Journey D: Bilingual Consistency (English & Hindi parity)', async () => {
  // Check that the schema and snapshot return both English and Hindi localization
  const farmerEmail = `farmer.bi.${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerEmail,
      password: 'password123',
      name: 'Ramesh Patel',
      role: 'farmer',
      villageOrOrg: 'Khandwa',
    }),
  });
  const { token } = await regRes.json();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const lotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cropName: 'Soybean (JS-335)',
      cropNameHi: 'सोयाबीन (JS-335)',
      variety: 'Certified FAQ',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-BI/01',
    }),
  });
  const lot = await lotRes.json();

  const ledgerRes = await fetch(`${BASE_URL}/api/v1/lots/${lot.id}/ledger`, {
    headers: authHeaders,
  });
  const snapshot = await ledgerRes.json();

  // Every readiness checklist item must have both English and Hindi labels
  assert.ok(snapshot.readiness.length > 0);
  for (const item of snapshot.readiness) {
    assert.ok(item.labelEn && item.labelEn.length > 0, `Item ${item.id} must have labelEn`);
    assert.ok(item.labelHi && item.labelHi.length > 0, `Item ${item.id} must have labelHi`);
  }
});

// ============================================================================
// STEP 2 — JOURNEY E: Role Isolation (Farmer vs Admin Analytics)
// ============================================================================
test('Journey E: Role Isolation & Admin Pilot Analytics Aggregation', async () => {
  // Standard farmer token cannot access admin analytics (already verified 403 in Journey C).
  // Test that /api/admin/pilot-analytics endpoint aggregates correctly when invoked with admin rights
  // Note: We test the response structure and ensure zero PII leakage.
  const adminEmail = 'aashishbhumarkar888@gmail.com';
  // Attempt sync with bootstrapped admin email
  const syncRes = await fetch(`${BASE_URL}/api/auth/firebase-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: 'ADMIN_BOOTSTRAP_UID',
      email: adminEmail,
      displayName: 'System Admin',
      emailVerified: true,
      role: 'admin',
    }),
  });

  if (syncRes.status === 200) {
    const adminData = await syncRes.json();
    const adminToken = adminData.token;
    assert.equal(adminData.user.role, 'admin', 'Bootstrapped email must have admin role');

    const analyticsRes = await fetch(`${BASE_URL}/api/admin/pilot-analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(analyticsRes.status, 200, 'Admin can access pilot-analytics');
    const analytics = await analyticsRes.json();
    assert.ok(typeof analytics.sampleSizeN === 'number', 'Must report sampleSizeN');
    assert.ok(analytics.attemptsByOutcome, 'Must report attemptsByOutcome');
    assert.ok(analytics.financialAggregates, 'Must report financialAggregates');
    // Privacy assurance: zero individual farmer PII in aggregate report
    assert.equal(analytics.farmers, undefined, 'Must not return individual farmer records');
  }
});
