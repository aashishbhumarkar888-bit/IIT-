import test from 'node:test';
import assert from 'node:assert/strict';
import { CropToCashService } from '../src/services/cropToCashService.ts';

test('Financial Return Engine: Exact 50-Quintal Fixture Verification', () => {
  const lotId = 'KS-TEST-50QTL';
  const qty = 50;

  const estimate = CropToCashService.calculateReturnEstimate(lotId, qty);

  // 1. FCI/MSP reference: ₹2,585/qtl − ₹2,500 costs = ₹1,26,750 estimated net.
  const fci = estimate.options.fciMsp;
  assert.equal(fci.unitPrice, 2585, 'FCI MSP price per quintal should be 2585');
  assert.equal(fci.grossAmount, 50 * 2585, 'FCI gross should be ₹1,29,250');
  assert.equal(fci.deductions.totalDeductions, 2500, 'FCI costs should be ₹2,500');
  assert.equal(fci.netReturn, 126750, 'FCI estimated net must be exactly ₹1,26,750');

  // 2. Mandi: ₹2,300/qtl − ₹4,000 costs = ₹1,11,000 estimated net.
  const mandi = estimate.options.mandi;
  assert.equal(mandi.unitPrice, 2300, 'Mandi price per quintal should be 2300');
  assert.equal(mandi.grossAmount, 50 * 2300, 'Mandi gross should be ₹1,15,000');
  assert.equal(mandi.deductions.totalDeductions, 4000, 'Mandi costs should be ₹4,000');
  assert.equal(mandi.netReturn, 111000, 'Mandi estimated net must be exactly ₹1,11,000');

  // 3. Direct buyer: ₹2,350/qtl − ₹4,000 costs = ₹1,13,500 estimated net.
  const direct = estimate.options.directBuyer;
  assert.equal(direct.unitPrice, 2350, 'Direct buyer price per quintal should be 2350');
  assert.equal(direct.grossAmount, 50 * 2350, 'Direct gross should be ₹1,17,500');
  assert.equal(direct.deductions.totalDeductions, 4000, 'Direct costs should be ₹4,000');
  assert.equal(direct.netReturn, 113500, 'Direct buyer estimated net must be exactly ₹1,13,500');

  // 4. Downside: FCI rejected; fallback to direct buyer with an additional ₹1,000 trip = ₹1,12,500 estimated net.
  const downside = estimate.options.downsideFallback;
  assert.equal(downside.unitPrice, 2350, 'Downside direct price should be 2350');
  assert.equal(downside.grossAmount, 50 * 2350, 'Downside gross should be ₹1,17,500');
  assert.equal(downside.deductions.totalDeductions, 5000, 'Downside deductions should be ₹4,000 + ₹1,000 = ₹5,000');
  assert.equal(downside.netReturn, 112500, 'Downside estimated net must be exactly ₹1,12,500');
});

test('Crop Screening Service: Validates image payload and abstains from pesticide prescription', () => {
  // Test invalid image size
  const oversized = CropToCashService.screenCropImage({
    imageFormat: 'jpeg',
    imageSizeBytes: 12 * 1024 * 1024,
  });
  assert.equal(oversized.outcomeCategory, 'IMAGE_QUALITY_REJECTED');
  assert.equal(oversized.calibratedConfidence, false);

  // Test valid payload
  const valid = CropToCashService.screenCropImage({
    imageFormat: 'jpeg',
    imageSizeBytes: 1024 * 500,
    lotId: 'LOT-DEMO-01',
  });
  assert.equal(valid.isMockOrDemo, true);
  assert.equal(valid.calibratedConfidence, false);
  assert.ok(valid.topClass !== null);
  // Safe referral check: Ensure no chemical advice, must refer to KVK / Extension Officer
  assert.ok(valid.explanation.safeExpertReferral.includes('Krishi Vigyan Kendra (KVK)'));
  assert.ok(!valid.explanation.safeExpertReferral.toLowerCase().includes('spray 500ml'));
});
