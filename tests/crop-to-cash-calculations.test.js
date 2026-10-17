import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateSellingOptions } from '../src/services/cropToCashCalculations.ts';

const lotId = 'KS-DEMO-LOT-50';
const quotes = [
  {
    option: 'FCI_MSP_REFERENCE',
    lotId,
    pricePerQuintal: 2585,
    commodity: 'Wheat',
    grade: 'FAQ',
    market: 'Illustrative FCI/MSP reference',
    source: 'Fictional fixture',
    timestamp: '2026-10-18T00:00:00.000Z',
    freshness: 'Illustrative only',
    provenance: 'DEMO',
  },
  {
    option: 'MANDI',
    lotId,
    pricePerQuintal: 2300,
    commodity: 'Wheat',
    grade: 'FAQ',
    market: 'Illustrative local mandi',
    source: 'Fictional fixture',
    timestamp: '2026-10-18T00:00:00.000Z',
    freshness: 'Illustrative only',
    provenance: 'DEMO',
  },
  {
    option: 'DIRECT_BUYER',
    lotId,
    pricePerQuintal: 2350,
    commodity: 'Wheat',
    grade: 'FAQ',
    market: 'Illustrative direct buyer',
    source: 'Fictional fixture',
    timestamp: '2026-10-18T00:00:00.000Z',
    freshness: 'Illustrative only',
    provenance: 'DEMO',
  },
];

test('50-qtl crop-to-cash fixture matches the specified net values and downside', () => {
  const result = calculateSellingOptions(50, quotes, {
    fciCosts: 2500,
    mandiCosts: 4000,
    directCosts: 4000,
    extraTripCost: 1000,
  });

  assert.deepEqual(
    result.estimates.map(({ option, net }) => [option, net]),
    [
      ['FCI_MSP_REFERENCE', 126750],
      ['MANDI', 111000],
      ['DIRECT_BUYER', 113500],
    ]
  );
  assert.equal(result.downsideNet, 112500);
  assert.ok(quotes.every((quote) => quote.lotId === lotId));
});

test('selling estimate rejects invalid quantity and negative costs', () => {
  assert.match(
    calculateSellingOptions(0, quotes, {
      fciCosts: 2500,
      mandiCosts: 4000,
      directCosts: 4000,
      extraTripCost: 1000,
    }).error,
    /quantity greater than zero/
  );
  assert.match(
    calculateSellingOptions(50, quotes, {
      fciCosts: 2500,
      mandiCosts: -1,
      directCosts: 4000,
      extraTripCost: 1000,
    }).error,
    /non-negative/
  );
});
