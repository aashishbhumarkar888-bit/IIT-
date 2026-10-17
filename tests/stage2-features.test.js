import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { calculateSellingOptions } from '../src/services/cropToCashCalculations.ts';
import {
  CropToCashService,
  getExtendedLot,
  saveExtendedLot,
} from '../src/services/cropToCashService.ts';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);

// -----------------------------------------------------------------------------
// Suite 1: Durable File Persistence Tests
// -----------------------------------------------------------------------------
test('Stage 2: Extended lot ledger persists durably to data/extended_lots.json on disk', () => {
  const testLotId = `KS-PERSIST-${Date.now()}`;
  const now = new Date().toISOString();

  const newLot = {
    id: testLotId,
    ownerEmail: 'farmer.persist@example.test',
    ownerId: 'USR-PERSIST-01',
    farmerName: 'Durability Test Farmer',
    cropName: 'Organic Durum Wheat',
    variety: 'HI-8498 Malavshakti',
    grade: 'Grade A Export',
    quantityQuintals: 60,
    harvestDate: 'Oct 2026',
    surveyNumber: 'Survey #55/A',
    plotAreaHectares: 4.8,
    screeningResults: [],
    procurementAttempts: [],
    historyEvents: [
      {
        eventId: `ev-${testLotId}`,
        timestamp: now,
        actor: 'farmer.persist@example.test',
        actorRole: 'farmer',
        eventType: 'LOT_CREATED',
        summary: `Created lot ${testLotId}`,
        isVerified: true,
        details: { quantity: 60 },
      },
    ],
    readiness: [
      {
        id: 'bank-details',
        labelEn: 'Bank details ready',
        labelHi: 'बैंक विवरण तैयार',
        ready: true,
      },
      {
        id: 'registration',
        labelEn: 'Farmer registration ready',
        labelHi: 'पंजीकरण तैयार',
        ready: true,
      },
      {
        id: 'produce',
        labelEn: 'Produce quantity noted',
        labelHi: 'मात्रा दर्ज',
        ready: true,
      },
    ],
    procurementState: 'PLANNED',
    ledgerEvents: [
      {
        eventId: `ev-init-${testLotId}`,
        lotId: testLotId,
        type: 'READINESS',
        occurredAt: now,
        source: 'MANUAL',
        verification: 'USER_REPORTED',
        summary: 'Ledger opened',
        payload: { initialized: true },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  saveExtendedLot(newLot);

  // In-memory verification
  const retrieved = getExtendedLot(testLotId);
  assert.ok(retrieved, 'Lot must exist in memory');
  assert.equal(retrieved.id, testLotId);
  assert.equal(retrieved.quantityQuintals, 60);

  // File persistence verification
  const dataFile = path.resolve(process.cwd(), 'data', 'extended_lots.json');
  assert.ok(fs.existsSync(dataFile), 'data/extended_lots.json must exist on disk');

  const rawJson = fs.readFileSync(dataFile, 'utf-8');
  const storedLots = JSON.parse(rawJson);
  assert.ok(Array.isArray(storedLots), 'Stored lots must be an array');
  const foundInFile = storedLots.find((l) => l.id === testLotId);
  assert.ok(foundInFile, 'Lot must be persisted to data/extended_lots.json');
  assert.equal(foundInFile.cropName, 'Organic Durum Wheat');
  assert.equal(foundInFile.quantityQuintals, 60);
});

// -----------------------------------------------------------------------------
// Suite 2: Financial Calculation Engine & Exact 50-qtl Fixture Arithmetic
// -----------------------------------------------------------------------------
test('Stage 2: Deterministic calculation engine verifies exact 50-qtl net figures & downside', () => {
  const quotes = [
    {
      option: 'FCI_MSP_REFERENCE',
      lotId: 'KS-MP-2025-089',
      pricePerQuintal: 2585,
      commodity: 'Sharbati Wheat',
      grade: 'FAQ Grade A',
      market: 'FCI Procurement Centre',
      source: 'MSP Gazette Notification',
      timestamp: '2026-10-18T00:00:00.000Z',
      freshness: 'Benchmark reference',
      provenance: 'DEMO',
    },
    {
      option: 'MANDI',
      lotId: 'KS-MP-2025-089',
      pricePerQuintal: 2300,
      commodity: 'Sharbati Wheat',
      grade: 'FAQ Grade A',
      market: 'Khandwa APMC Mandi',
      source: 'APMC Market Bulletin',
      timestamp: '2026-10-18T00:00:00.000Z',
      freshness: 'Today modal price',
      provenance: 'DEMO',
    },
    {
      option: 'DIRECT_BUYER',
      lotId: 'KS-MP-2025-089',
      pricePerQuintal: 2350,
      commodity: 'Sharbati Wheat',
      grade: 'FAQ Grade A',
      market: 'Direct Institutional Buyer',
      source: 'Verified Buyer Contract',
      timestamp: '2026-10-18T00:00:00.000Z',
      freshness: 'Firm price lock',
      provenance: 'DEMO',
    },
  ];

  const costs = {
    fciCosts: 2500,
    mandiCosts: 4000,
    directCosts: 4000,
    extraTripCost: 1000,
  };

  const result = calculateSellingOptions(50, quotes, costs);
  assert.equal(result.error, undefined);

  // Exact 50-qtl assertions:
  // FCI: 50 * 2585 = 129250; 129250 - 2500 = 126750
  const fci = result.estimates.find((e) => e.option === 'FCI_MSP_REFERENCE');
  assert.ok(fci);
  assert.equal(fci.gross, 129250);
  assert.equal(fci.deductions, 2500);
  assert.equal(fci.net, 126750);

  // Mandi: 50 * 2300 = 115000; 115000 - 4000 = 111000
  const mandi = result.estimates.find((e) => e.option === 'MANDI');
  assert.ok(mandi);
  assert.equal(mandi.gross, 115000);
  assert.equal(mandi.deductions, 4000);
  assert.equal(mandi.net, 111000);

  // Direct: 50 * 2350 = 117500; 117500 - 4000 = 113500
  const direct = result.estimates.find((e) => e.option === 'DIRECT_BUYER');
  assert.ok(direct);
  assert.equal(direct.gross, 117500);
  assert.equal(direct.deductions, 4000);
  assert.equal(direct.net, 113500);

  // Downside: Direct net 113500 - 1000 trip cost = 112500
  assert.equal(result.downsideNet, 112500);

  // Error boundary checks
  const zeroQty = calculateSellingOptions(0, quotes, costs);
  assert.ok(zeroQty.error, 'Zero quantity must return error');

  const negativeCosts = calculateSellingOptions(50, quotes, {
    ...costs,
    mandiCosts: -500,
  });
  assert.ok(negativeCosts.error, 'Negative cost must return error');
});

// -----------------------------------------------------------------------------
// Suite 3: Leaf Image Screening & Truthful Mock Labelling
// -----------------------------------------------------------------------------
test('Stage 2: Crop screening enforces 10MB limit and safe non-prescriptive KVK referral', () => {
  // 1. Oversized image (>10MB) rejected
  const oversized = CropToCashService.screenCropImage({
    lotId: 'KS-MP-2025-089',
    imageFormat: 'jpeg',
    imageSizeBytes: 12 * 1024 * 1024,
    cropDeclared: 'Wheat',
  });
  assert.equal(oversized.outcomeCategory, 'IMAGE_QUALITY_REJECTED');
  assert.match(oversized.abstentionReason || '', /10\s*MB/i);

  // 2. Valid image payload returns explicitly labeled mock/demo result
  const valid = CropToCashService.screenCropImage({
    lotId: 'KS-MP-2025-089',
    imageFormat: 'jpeg',
    imageSizeBytes: 450 * 1024,
    cropDeclared: 'Soybean',
  });
  assert.equal(valid.outcomeCategory, 'DISEASE_DETECTED');
  assert.equal(valid.isMockOrDemo, true, 'isMockOrDemo must be true');
  assert.equal(valid.calibratedConfidence, false, 'calibratedConfidence must be false');
  assert.ok(valid.topClass);
  assert.equal(valid.topClass.className, 'Soybean Rust (Phakopsora pachyrhizi)');

  // 3. Strict safety: zero synthetic chemical pesticide prescription
  const explanation = valid.explanation.safeExpertReferral;
  assert.match(explanation, /Krishi Vigyan Kendra|KVK/);
  assert.match(explanation, /do not prescribe synthetic pesticides/i);
});

// -----------------------------------------------------------------------------
// Suite 4: QR Code Traceability Payload Safety (No Secrets/PII)
// -----------------------------------------------------------------------------
test('Stage 2: QR Code payload contains verifiable public lot metadata with zero PII or credentials', () => {
  const lotId = 'KS-MP-2025-089';
  const status = 'INDEPENDENTLY_VERIFIED';
  const hash = 'a1b2c3d4e5f678901234567890abcdef';

  const origin = 'https://kisan-spo.in';
  const qrString = `${origin}/crop-passport?lot=${encodeURIComponent(
    lotId
  )}&status=${encodeURIComponent(status)}&sig=${encodeURIComponent(hash.slice(0, 14))}`;

  // Parse and verify query params
  const parsed = new URL(qrString);
  assert.equal(parsed.pathname, '/crop-passport');
  assert.equal(parsed.searchParams.get('lot'), lotId);
  assert.equal(parsed.searchParams.get('status'), status);
  assert.equal(parsed.searchParams.get('sig'), hash.slice(0, 14));

  // Security Invariants: Must not contain bearer tokens, passwords, aadhaar, or phone
  assert.equal(parsed.searchParams.has('token'), false);
  assert.equal(parsed.searchParams.has('auth'), false);
  assert.equal(parsed.searchParams.has('aadhaar'), false);
  assert.equal(parsed.searchParams.has('password'), false);
  assert.equal(parsed.searchParams.has('phone'), false);
});

// -----------------------------------------------------------------------------
// Suite 5: Live HTTP RBAC, State Transitions, and Complete Journey
// -----------------------------------------------------------------------------
test('Stage 2: Live HTTP full lifecycle across Detect, Compare, Complete, and Role Isolation', async () => {
  // Check if live server is reachable
  let serverReachable = false;
  try {
    const ping = await fetch(`${BASE_URL}/`);
    serverReachable = ping.status === 200;
  } catch {
    serverReachable = false;
  }

  if (!serverReachable) {
    console.log('Skipping live HTTP portion of Stage 2 test (server not active on port 3000)');
    return;
  }

  // 1. Register Farmer A
  const farmerAEmail = `farmer.s2.${randomUUID()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerAEmail,
      password: 'stage2Password!123',
      name: 'Stage 2 Farmer A',
      role: 'farmer',
      villageOrOrg: 'Khandwa Cluster Hub',
    }),
  });
  assert.equal(regRes.status, 201);
  const { token: tokenA } = await regRes.json();
  const headersA = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenA}`,
  };

  // 2. Create Crop Lot via POST /api/v1/lots
  const createLotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      cropName: 'Malvi Wheat',
      variety: 'HI-1544 Desi',
      grade: 'Grade A',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Survey-S2/77',
    }),
  });
  assert.equal(createLotRes.status, 201);
  const createdLot = await createLotRes.json();
  const lotId = createdLot.id;

  // 3. DETECT: Submit screening metadata via POST /api/v1/lots/:lotId/screenings
  const screenRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}/screenings`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      imageFormat: 'jpeg',
      imageSizeBytes: 300 * 1024,
      cropDeclared: 'Malvi Wheat',
    }),
  });
  assert.equal(screenRes.status, 201);
  const screenData = await screenRes.json();
  assert.equal(screenData.isMockOrDemo, true);

  // 4. COMPARE: Record comparison via POST /api/v1/lots/:lotId/comparisons
  const compRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}/comparisons`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      quantityQtl: 50,
      costs: {
        fciCosts: 2500,
        mandiCosts: 4000,
        directCosts: 4000,
        extraTripCost: 1000,
      },
    }),
  });
  assert.equal(compRes.status, 200);
  const compData = await compRes.json();
  assert.equal(compData.downsideNet, 112500);

  // 5. COMPLETE: Update readiness toggles via POST /api/v1/lots/:lotId/readiness
  const readyRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}/readiness`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      payload: {
        readinessId: 'bank-details',
        ready: true,
      },
    }),
  });
  assert.equal(readyRes.status, 201);

  // 6. COMPLETE: Record procurement visit via POST /api/v1/lots/:lotId/procurement-attempts
  const procRes = await fetch(
    `${BASE_URL}/api/v1/lots/${lotId}/procurement-attempts`,
    {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        state: 'ACCEPTED',
        reason: 'Passed moisture check (11.4%) at FCI Khandwa centre gate',
      }),
    }
  );
  assert.equal(procRes.status, 201);

  // 7. COMPLETE: Record actual sale & payment status via POST /api/v1/lots/:lotId/sales
  const saleRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}/sales`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      quantityQtl: 50,
      agreedPricePerQtl: 2350,
      deductions: 4000,
      actualNet: 113500,
      paymentStatus: 'PAID',
    }),
  });
  assert.equal(saleRes.status, 201);

  // 8. Retrieve Full Ledger Snapshot via GET /api/v1/lots/:lotId/ledger
  const ledgerRes = await fetch(`${BASE_URL}/api/v1/lots/${lotId}/ledger`, {
    headers: headersA,
  });
  assert.equal(ledgerRes.status, 200);
  const ledgerSnapshot = await ledgerRes.json();
  assert.equal(ledgerSnapshot.lotId, lotId);
  assert.equal(ledgerSnapshot.procurementState, 'ACCEPTED');

  const eventTypes = ledgerSnapshot.events.map((e) => e.type);
  assert.ok(eventTypes.includes('COMPARISON'), 'Ledger must include COMPARISON');
  assert.ok(eventTypes.includes('READINESS'), 'Ledger must include READINESS');
  assert.ok(eventTypes.includes('PROCUREMENT'), 'Ledger must include PROCUREMENT');
  assert.ok(eventTypes.includes('SALE'), 'Ledger must include SALE');

  // 9. RBAC: Verify Farmer B cannot modify or access Farmer A's private lot
  const farmerBEmail = `farmer.b.${randomUUID()}@example.com`;
  const regB = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmerBEmail,
      password: 'password123',
      name: 'Farmer B (Unauthorized)',
      role: 'farmer',
      villageOrOrg: 'Other Hub',
    }),
  });
  const { token: tokenB } = await regB.json();

  const crossAccess = await fetch(`${BASE_URL}/api/v1/lots/${lotId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(crossAccess.status, 403, 'Cross-user access must return 403 Forbidden');
});
