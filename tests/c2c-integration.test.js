import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('Minimum Integration Milestone: Full End-to-End Crop-to-Cash Flow', async () => {
  // 1. Authenticate user (register or login test farmer)
  const regEmail = `farmer.c2c.${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      password: 'password123',
      name: 'Ramesh Demo Farmer',
      role: 'farmer',
      villageOrOrg: 'Khandwa Pilot Village',
    }),
  });
  assert.equal(regRes.status, 201, 'Registration must return 201');
  const regData = await regRes.json();
  const token = regData.token;
  assert.ok(token, 'Must return session token');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Step 1: Create a fictional demo crop lot (50 quintals)
  const lotRes = await fetch(`${BASE_URL}/api/c2c/lots`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cropName: 'Soybean (JS-335)',
      variety: 'Grade A Certified',
      quantityQuintals: 50,
      harvestDate: 'Oct 2026',
      surveyNumber: 'Plot-99/A',
    }),
  });
  assert.equal(lotRes.status, 201, 'Lot creation must return 201');
  const lotData = await lotRes.json();
  const lotId = lotData.id;
  assert.ok(lotId, 'Lot must have a persistent ID');
  assert.equal(lotData.quantityQuintals, 50, 'Quantity must be 50 quintals');

  // Step 2: Retrieve that same lot by ID
  const getLotRes = await fetch(`${BASE_URL}/api/c2c/lots/${lotId}`, {
    headers: authHeaders,
  });
  assert.equal(getLotRes.status, 200, 'Lot fetch by ID must return 200');
  const fetchedLot = await getLotRes.json();
  assert.equal(fetchedLot.id, lotId, 'Fetched lot ID must match created ID');

  // Step 3: Submit a clearly labelled demo screening
  const screenRes = await fetch(`${BASE_URL}/api/c2c/lots/${lotId}/screening`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      imageFormat: 'jpeg',
      imageSizeBytes: 450000,
      cropDeclared: 'Soybean',
    }),
  });
  assert.equal(screenRes.status, 200, 'Screening submission must return 200');
  const screenData = await screenRes.json();
  assert.equal(screenData.isMockOrDemo, true, 'Screening must be clearly marked as mock or demo');
  assert.ok(screenData.outcomeCategory, 'Must return an outcome category');

  // Step 4: Return the three financial options with the exact fixture values
  // - FCI/MSP reference: ₹2,585/qtl − ₹2,500 costs = ₹1,26,750 estimated net.
  // - Mandi: ₹2,300/qtl − ₹4,000 costs = ₹1,11,000 estimated net.
  // - Direct buyer: ₹2,350/qtl − ₹4,000 costs = ₹1,13,500 estimated net.
  // - Downside: FCI rejected; fallback to direct buyer with additional ₹1,000 trip = ₹1,12,500 estimated net.
  const estRes = await fetch(`${BASE_URL}/api/c2c/lots/${lotId}/estimate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(estRes.status, 200, 'Estimate generation must return 200');
  const estData = await estRes.json();
  assert.equal(estData.options.fciMsp.netReturn, 126750, 'FCI net must be exactly ₹1,26,750');
  assert.equal(estData.options.mandi.netReturn, 111000, 'Mandi net must be exactly ₹1,11,000');
  assert.equal(estData.options.directBuyer.netReturn, 113500, 'Direct Buyer net must be exactly ₹1,13,500');
  assert.equal(estData.options.downsideFallback.netReturn, 112500, 'Downside fallback net must be exactly ₹1,12,500');

  // Step 5: Record a procurement attempt and outcome
  const attemptRes = await fetch(`${BASE_URL}/api/c2c/lots/${lotId}/procurement-attempt`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      centreId: 'FCI-KHD-01',
      centreName: 'Khandwa FCI Depot Centre',
      isCentreVerified: true,
      outcome: 'ACCEPTED',
      outcomeReason: 'Moisture below 12%, FAQ specification verified.',
      farmerIdPresented: true,
      landRecordReady: true,
      bankPassbookReady: true,
    }),
  });
  assert.equal(attemptRes.status, 201, 'Attempt creation must return 201');
  const attemptData = await attemptRes.json();
  assert.equal(attemptData.outcome, 'ACCEPTED');
  assert.equal(attemptData.documentReadiness.allDocumentsReady, true);

  // Step 6: Record an actual sale and payment status
  const saleRes = await fetch(`${BASE_URL}/api/c2c/lots/${lotId}/sale`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      buyerName: 'ITC Choupal Sagar',
      buyerType: 'INSTITUTIONAL_BUYER',
      acceptedQuantityQuintals: 50,
      actualPricePerQuintal: 2350,
      actualTransportDeduction: 2500,
      actualHandlingDeduction: 1000,
      actualFeesDeduction: 500,
      paymentStatus: 'FIRST_INSTALLMENT_PAID',
    }),
  });
  assert.equal(saleRes.status, 201, 'Sale recording must return 201');
  const saleData = await saleRes.json();
  assert.equal(saleData.actualNetAmount, 113500, 'Actual net amount should match ₹1,13,500');
  assert.equal(saleData.paymentStatus, 'FIRST_INSTALLMENT_PAID');

  // Step 7: Retrieve the same lot with its full history and estimate-versus-actual data
  const finalLotRes = await fetch(`${BASE_URL}/api/c2c/lots/${lotId}`, {
    headers: authHeaders,
  });
  assert.equal(finalLotRes.status, 200);
  const finalLot = await finalLotRes.json();
  assert.equal(finalLot.id, lotId);
  assert.equal(finalLot.screeningResults.length, 1, 'Should contain recorded screening');
  assert.ok(finalLot.latestEstimate, 'Should contain latest return estimate');
  assert.equal(finalLot.procurementAttempts.length, 1, 'Should contain procurement attempt');
  assert.ok(finalLot.saleRecord, 'Should contain sale record');
  assert.ok(finalLot.historyEvents.length >= 4, 'Should contain complete append-only history trail');
});
