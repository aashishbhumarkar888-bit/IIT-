import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createCropToCashApiAdapter,
  createCropToCashMockAdapter,
  CropToCashApiError,
} from '../src/services/cropToCashAdapter.ts';

test('demo adapter keeps quotes and timeline events associated with the same lot id', async () => {
  const adapter = createCropToCashMockAdapter(
    () => new Date('2026-10-18T12:30:00.000Z')
  );
  const lotId = 'KS-TEST-104';
  const quotes = await adapter.getQuotes(lotId);
  assert.ok(quotes.length >= 3);
  assert.ok(quotes.every((quote) => quote.lotId === lotId));
  assert.ok(quotes.every((quote) => quote.provenance === 'DEMO'));

  await adapter.appendEvent({
    lotId,
    type: 'READINESS',
    source: 'DEMO',
    verification: 'DEMO ONLY',
    summary: 'Registration readiness marked yes.',
    payload: { readinessId: 'registration', ready: true },
  });

  const snapshot = await adapter.getSnapshot(lotId);
  assert.equal(snapshot.lotId, lotId);
  assert.equal(snapshot.readiness.find((item) => item.id === 'registration').ready, true);
  assert.equal(snapshot.events.at(-1).lotId, lotId);
  assert.equal(snapshot.events.at(-1).occurredAt, '2026-10-18T12:30:00.000Z');
});

test('demo comparison returns and records the same fixture result in the lot timeline', async () => {
  const adapter = createCropToCashMockAdapter(
    () => new Date('2026-10-18T12:30:00.000Z')
  );
  const lotId = 'KS-COMPARISON-TEST';
  const quotes = await adapter.getQuotes(lotId);
  const comparison = await adapter.recordComparison(lotId, 50, {
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
  assert.equal(comparison.event.lotId, lotId);
  assert.equal(comparison.event.source, 'DEMO');
  assert.deepEqual(
    (await adapter.getSnapshot(lotId)).events.at(-1),
    comparison.event
  );
  assert.equal(quotes[0].lotId, lotId);
});

test('API adapter posts comparison inputs and validates the confirmed result', async () => {
  const lotId = 'KS-API-COMPARISON';
  let observedUrl = '';
  let observedBody = '';
  const event = {
    eventId: 'cmp-1',
    lotId,
    type: 'COMPARISON',
    occurredAt: '2026-10-18T12:30:00.000Z',
    source: 'ESTIMATED',
    verification: 'ESTIMATE — not an offer',
    summary: 'Recorded comparison.',
    payload: { quantityQtl: 50 },
  };
  const adapter = createCropToCashApiAdapter(
    () => null,
    async (input, init) => {
      observedUrl = String(input);
      observedBody = String(init?.body);
      return Response.json({
        lotId,
        calculationVersion: 'v1',
        estimates: [
          { option: 'FCI_MSP_REFERENCE', gross: 129250, deductions: 2500, net: 126750 },
          { option: 'MANDI', gross: 115000, deductions: 4000, net: 111000 },
          { option: 'DIRECT_BUYER', gross: 117500, deductions: 4000, net: 113500 },
        ],
        downsideNet: 112500,
        event,
      });
    }
  );
  const costs = {
    fciCosts: 2500,
    mandiCosts: 4000,
    directCosts: 4000,
    extraTripCost: 1000,
  };

  const result = await adapter.recordComparison(lotId, 50, costs);

  assert.equal(observedUrl, '/api/v1/lots/KS-API-COMPARISON/comparisons');
  assert.deepEqual(JSON.parse(observedBody), { quantityQtl: 50, costs });
  assert.deepEqual(result.event, event);
  assert.equal(result.estimates[0].net, 126750);
});

test('API adapter rejects comparison events associated with another lot', async () => {
  const adapter = createCropToCashApiAdapter(
    () => null,
    async () =>
      Response.json({
        lotId: 'KS-EXPECTED',
        calculationVersion: 'v1',
        estimates: [],
        downsideNet: null,
        event: {
          eventId: 'cmp-foreign',
          lotId: 'KS-OTHER',
          type: 'COMPARISON',
          occurredAt: '2026-10-18T12:30:00.000Z',
          source: 'ESTIMATED',
          verification: 'ESTIMATE — not an offer',
          summary: 'Recorded comparison.',
          payload: {},
        },
      })
  );

  await assert.rejects(
    adapter.recordComparison('KS-EXPECTED', 50, {
      fciCosts: 2500,
      mandiCosts: 4000,
      directCosts: 4000,
      extraTripCost: 1000,
    }),
    (error) =>
      error instanceof CropToCashApiError &&
      /response format/.test(error.message)
  );
});

test('API adapter attaches the bearer token and rejects unexpected response shapes', async () => {
  let observedAuthorization = '';
  const adapter = createCropToCashApiAdapter(
    () => 'signed-example-token',
    async (_input, init) => {
      observedAuthorization = new Headers(init?.headers).get('Authorization');
      return Response.json({ unexpected: true });
    }
  );

  await assert.rejects(
    adapter.getSnapshot('KS-TEST-105'),
    (error) =>
      error instanceof CropToCashApiError &&
      /response format/.test(error.message) &&
      !error.retryable
  );
  assert.equal(observedAuthorization, 'Bearer signed-example-token');
});

test('API adapter reports server errors and their retryability', async () => {
  const adapter = createCropToCashApiAdapter(
    () => null,
    async () =>
      Response.json(
        {
          error: {
            code: 'TEMPORARY_UNAVAILABLE',
            message: 'Try the request again.',
            retryable: true,
          },
        },
        { status: 503 }
      )
  );

  await assert.rejects(
    adapter.getSnapshot('KS-TEST-106'),
    (error) =>
      error instanceof CropToCashApiError &&
      error.status === 503 &&
      error.retryable &&
      error.message === 'Try the request again.'
  );
});
