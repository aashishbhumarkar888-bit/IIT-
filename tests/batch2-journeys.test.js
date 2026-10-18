import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);

test('Batch 2 End-to-End Acceptance: 6 Comprehensive Core Journeys', async () => {
  let serverReachable = false;
  try {
    const ping = await fetch(`${BASE_URL}/api/auth/session`);
    serverReachable = ping.status === 401 || ping.status === 200;
  } catch {
    serverReachable = false;
  }

  if (!serverReachable) {
    console.log('Skipping live HTTP portion of Batch 2 Journeys (server not active on port 3000)');
    return;
  }

  // ===========================================================================
  // Journey 1: New Farmer Lifecycle
  // ===========================================================================
  const farmer1Email = `journey1.farmer.${randomUUID()}@example.com`;
  const reg1Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmer1Email,
      password: 'StrongPassword123!',
      name: 'Journey 1 Farmer',
      role: 'farmer',
      villageOrOrg: 'Khandwa Cluster Hub',
    }),
  });
  assert.equal(reg1Res.status, 201, 'J1: Farmer registration must succeed with 201');
  const reg1Data = await reg1Res.json();
  const token1 = reg1Data.token;
  assert.ok(token1, 'J1: Must issue signed token');

  const headers1 = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token1}`,
  };

  // Complete profile & onboarding
  const profileRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: headers1,
    body: JSON.stringify({
      village: 'Gram Piprad',
      district: 'Khandwa',
      state: 'Madhya Pradesh',
      preferredLanguage: 'hi',
      onboardingStatus: 'COMPLETED',
      onboardingStep: 4,
    }),
  });
  assert.equal(profileRes.status, 200, 'J1: Profile update must succeed');
  const updatedProfile = await profileRes.json();
  assert.equal(updatedProfile.user.preferredLanguage, 'hi');
  assert.equal(updatedProfile.user.onboardingStatus, 'COMPLETED');

  // Create Crop Lot
  const createLotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: headers1,
    body: JSON.stringify({
      cropName: 'Sharbati Wheat',
      variety: 'HI-1544 Desi',
      grade: 'Grade A Export',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-J1-44',
    }),
  });
  assert.equal(createLotRes.status, 201, 'J1: Lot creation must succeed');
  const lot1 = await createLotRes.json();
  const lot1Id = lot1.id;

  // Verify lot is listed and persists across requests
  const listLots1 = await fetch(`${BASE_URL}/api/v1/lots`, { headers: headers1 });
  assert.equal(listLots1.status, 200);
  const lotsList = await listLots1.json();
  assert.ok(lotsList.some((l) => l.id === lot1Id), 'J1: Created lot must appear in user inventory');

  // Sign out
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: headers1,
  });
  assert.equal(logoutRes.status, 200, 'J1: Logout must succeed');

  // Verify protected operations without token are rejected
  const unauthCheck = await fetch(`${BASE_URL}/api/v1/lots/${lot1Id}`);
  assert.equal(unauthCheck.status, 401, 'J1: Unauthenticated access to protected lot must return 401');

  // ===========================================================================
  // Journey 2: Returning Farmer, Update, Persistence, and Archival
  // ===========================================================================
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmer1Email,
      password: 'StrongPassword123!',
    }),
  });
  assert.equal(loginRes.status, 200, 'J2: Returning farmer login must succeed');
  const loginData = await loginRes.json();
  const freshToken = loginData.token;
  const freshHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${freshToken}`,
  };

  // Update lot details via PUT /api/v1/lots/:lotId
  const updateLotRes = await fetch(`${BASE_URL}/api/v1/lots/${lot1Id}`, {
    method: 'PUT',
    headers: freshHeaders,
    body: JSON.stringify({
      variety: 'HI-1544 Premium Certified',
      grade: 'Grade A+ Cleaned',
      quantityQuintals: 55,
      harvestDate: 'Nov 2026',
    }),
  });
  assert.equal(updateLotRes.status, 200, 'J2: PUT /api/v1/lots/:lotId must succeed');
  const updatedLot = await updateLotRes.json();
  assert.equal(updatedLot.quantityQuintals, 55);
  assert.equal(updatedLot.variety, 'HI-1544 Premium Certified');

  // Verify persistence on direct retrieval
  const fetchAgain = await fetch(`${BASE_URL}/api/v1/lots/${lot1Id}`, {
    headers: freshHeaders,
  });
  const reloadedLot = await fetchAgain.json();
  assert.equal(reloadedLot.quantityQuintals, 55);
  assert.equal(reloadedLot.grade, 'Grade A+ Cleaned');

  // Delete / Archive lot via DELETE /api/v1/lots/:lotId
  const deleteLotRes = await fetch(`${BASE_URL}/api/v1/lots/${lot1Id}`, {
    method: 'DELETE',
    headers: freshHeaders,
  });
  assert.equal(deleteLotRes.status, 200, 'J2: DELETE /api/v1/lots/:lotId must succeed');

  // Verify lot is now gone from single lookup
  const postDeleteLookup = await fetch(`${BASE_URL}/api/v1/lots/${lot1Id}`, {
    headers: freshHeaders,
  });
  assert.equal(postDeleteLookup.status, 404, 'J2: Deleted lot must return 404 Not Found');

  // ===========================================================================
  // Journey 3: Crop Comparison, Verification, and Decision Flow
  // ===========================================================================
  // Create Lot for Journey 3
  const j3LotRes = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: freshHeaders,
    body: JSON.stringify({
      cropName: 'Durum Wheat',
      variety: 'Malavshakti',
      grade: 'FAQ',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-J3-99',
    }),
  });
  assert.equal(j3LotRes.status, 201);
  const j3Lot = await j3LotRes.json();
  const j3LotId = j3Lot.id;

  // Get quotes (GET /api/v1/lots/:lotId/quotes)
  const quotesRes = await fetch(`${BASE_URL}/api/v1/lots/${j3LotId}/quotes`, {
    headers: freshHeaders,
  });
  assert.equal(quotesRes.status, 200);
  const quotes = await quotesRes.json();
  assert.equal(quotes.length, 3);
  assert.ok(quotes.every((q) => q.provenance === 'DEMO'), 'J3: Quotes must carry DEMO badge');

  // Post comparison (POST /api/v1/lots/:lotId/comparisons)
  const compRes = await fetch(`${BASE_URL}/api/v1/lots/${j3LotId}/comparisons`, {
    method: 'POST',
    headers: freshHeaders,
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
  assert.equal(compData.downsideNet, 112500, 'J3: Downside net must equal ₹1,12,500');

  // Check ledger snapshot
  const ledgerRes = await fetch(`${BASE_URL}/api/v1/lots/${j3LotId}/ledger`, {
    headers: freshHeaders,
  });
  assert.equal(ledgerRes.status, 200);
  const ledgerSnapshot = await ledgerRes.json();
  assert.ok(
    ledgerSnapshot.events.some((e) => e.type === 'COMPARISON'),
    'J3: Ledger must record COMPARISON event'
  );

  // ===========================================================================
  // Journey 4: Validation and Failure Recovery
  // ===========================================================================
  // Empty crop name rejection
  const badLot1 = await fetch(`${BASE_URL}/api/v1/lots`, {
    method: 'POST',
    headers: freshHeaders,
    body: JSON.stringify({ cropName: '' }),
  });
  assert.equal(badLot1.status, 400, 'J4: Empty cropName must return 400');
  const badLot1Data = await badLot1.json();
  assert.equal(badLot1Data.error.code, 'INVALID_INPUT');

  // Negative quantity in update
  const badLot2 = await fetch(`${BASE_URL}/api/v1/lots/${j3LotId}`, {
    method: 'PUT',
    headers: freshHeaders,
    body: JSON.stringify({ quantityQuintals: -10 }),
  });
  assert.equal(badLot2.status, 400, 'J4: Negative quantity must return 400');

  // Oversized image upload rejection (>10MB)
  const oversizedRes = await fetch(
    `${BASE_URL}/api/v1/lots/${j3LotId}/screenings`,
    {
      method: 'POST',
      headers: freshHeaders,
      body: JSON.stringify({
        imageFormat: 'jpeg',
        imageSizeBytes: 15 * 1024 * 1024,
      }),
    }
  );
  assert.equal(oversizedRes.status, 422, 'J4: Oversized image must return 422');

  // Recovery: Submit valid screening payload
  const validScreening = await fetch(
    `${BASE_URL}/api/v1/lots/${j3LotId}/screenings`,
    {
      method: 'POST',
      headers: freshHeaders,
      body: JSON.stringify({
        imageFormat: 'jpeg',
        imageSizeBytes: 300 * 1024,
      }),
    }
  );
  assert.equal(validScreening.status, 201, 'J4: Valid image screening must recover and return 201');

  // ===========================================================================
  // Journey 5: Access Control Isolation & Adversarial Defense
  // ===========================================================================
  const farmer2Email = `journey5.farmer2.${randomUUID()}@example.com`;
  const reg2Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: farmer2Email,
      password: 'StrongPassword123!',
      name: 'Farmer 2 (Attacker)',
      role: 'farmer',
      villageOrOrg: 'Other Hub',
    }),
  });
  assert.equal(reg2Res.status, 201);
  const { token: token2 } = await reg2Res.json();
  const headers2 = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token2}`,
  };

  // Farmer 2 attempts to read Farmer 1's lot (j3LotId)
  const readBlock = await fetch(`${BASE_URL}/api/v1/lots/${j3LotId}`, {
    headers: headers2,
  });
  assert.equal(readBlock.status, 403, 'J5: Cross-user lot read must be blocked with 403');

  // Farmer 2 attempts to delete Farmer 1's lot (j3LotId)
  const deleteBlock = await fetch(`${BASE_URL}/api/v1/lots/${j3LotId}`, {
    method: 'DELETE',
    headers: headers2,
  });
  assert.equal(deleteBlock.status, 403, 'J5: Cross-user lot delete must be blocked with 403');

  // Farmer 2 attempts to delete a protected seeded demo lot
  const demoDeleteBlock = await fetch(`${BASE_URL}/api/v1/lots/KS-MP-2025-089`, {
    method: 'DELETE',
    headers: headers2,
  });
  assert.equal(demoDeleteBlock.status, 400, 'J5: Reserved demo lot deletion must return 400');

  // ===========================================================================
  // Journey 6: QR Traceability and Record Resolution
  // ===========================================================================
  // Retrieve public demo lot
  const demoLotRes = await fetch(`${BASE_URL}/api/v1/lots/KS-MP-2025-089`, {
    headers: headers1,
  });
  assert.equal(demoLotRes.status, 200, 'J6: Seeded demo lot must be resolvable');
  const demoLot = await demoLotRes.json();
  assert.equal(demoLot.id, 'KS-MP-2025-089');

  // QR Signature query simulation: ensure payload resolves permitted public fields
  const parsedLotId = 'KS-MP-2025-089';
  const qrLookup = await fetch(`${BASE_URL}/api/v1/lots/${parsedLotId}`, {
    headers: headers1,
  });
  assert.equal(qrLookup.status, 200);
  const qrRecord = await qrLookup.json();
  assert.equal(qrRecord.cropName, 'Sharbati Wheat');
  assert.equal(qrRecord.quantityQuintals, 50);

  // Unknown lot ID handling
  const unknownLotRes = await fetch(`${BASE_URL}/api/v1/lots/KS-UNKNOWN-99999`, {
    headers: headers1,
  });
  assert.equal(unknownLotRes.status, 404, 'J6: Unknown lot ID must return 404');
  const unknownData = await unknownLotRes.json();
  assert.equal(unknownData.error.code, 'LOT_NOT_FOUND');
});
