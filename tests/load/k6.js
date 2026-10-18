import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const DEMO_LOT_ID = 'KS-MP-2025-089';

if (!/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(BASE_URL)) {
  throw new Error(
    'This load test only permits a local HTTP server (localhost, 127.0.0.1, or ::1).'
  );
}

const EMAIL = __ENV.K6_EMAIL;
const PASSWORD = __ENV.K6_PASSWORD;
if (!EMAIL || !PASSWORD) {
  throw new Error('Set K6_EMAIL and K6_PASSWORD to a local demo account.');
}

let sessionToken = '';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    'http_req_duration{step:app_shell}': ['p(95)<500'],
    'http_req_duration{step:authentication}': ['p(95)<500'],
    'http_req_duration{step:lot_list}': ['p(95)<500'],
    'http_req_duration{step:quotes}': ['p(95)<500'],
    'http_req_duration{step:ledger}': ['p(95)<500'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const localRequest = { redirects: 0 };

function getAuthHeaders() {
  return { Authorization: `Bearer ${sessionToken}` };
}

export default function () {
  const appShell = http.get(`${BASE_URL}/`, {
    ...localRequest,
    tags: { name: 'GET / (app shell)', step: 'app_shell' },
  });
  check(appShell, {
    'app shell returns 200': (response) => response.status === 200,
  });
  const appEntry = http.get(`${BASE_URL}/src/main.tsx`, {
    ...localRequest,
    tags: { name: 'GET /src/main.tsx (app entry)', step: 'app_shell' },
  });
  check(appEntry, {
    'app entry returns 200': (response) => response.status === 200,
  });
  sleep(1);

  if (!sessionToken) {
    const login = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      {
        ...localRequest,
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/auth/login', step: 'authentication' },
      }
    );
    const loginOk = check(login, {
      'demo login returns 200': (response) => response.status === 200,
      'demo login returns a session token': (response) =>
        Boolean(response.json('token')),
    });
    if (!loginOk) return;
    sessionToken = login.json('token');
  } else {
    const session = http.get(`${BASE_URL}/api/auth/session`, {
      ...localRequest,
      headers: getAuthHeaders(),
      tags: { name: 'GET /api/auth/session', step: 'authentication' },
    });
    const sessionOk = check(session, {
      'session restore returns 200': (response) => response.status === 200,
      'session restore stays authenticated': (response) =>
        response.json('authenticated') === true,
    });
    if (!sessionOk) {
      sessionToken = '';
      return;
    }
  }
  sleep(1);

  const lots = http.get(`${BASE_URL}/api/v1/lots`, {
    ...localRequest,
    headers: getAuthHeaders(),
    tags: { name: 'GET /api/v1/lots', step: 'lot_list' },
  });
  const lotsOk = check(lots, {
    'lot list returns 200': (response) => response.status === 200,
    'lot list returns an array': (response) => Array.isArray(response.json()),
  });
  if (!lotsOk) return;
  sleep(1);

  const quotes = http.get(
    `${BASE_URL}/api/v1/lots/${DEMO_LOT_ID}/quotes`,
    {
      ...localRequest,
      headers: getAuthHeaders(),
      tags: { name: 'GET /api/v1/lots/:lotId/quotes', step: 'quotes' },
    }
  );
  const quotesOk = check(quotes, {
    'quotes return 200': (response) => response.status === 200,
    'quotes return three demo options': (response) =>
      Array.isArray(response.json()) && response.json().length === 3,
  });
  if (!quotesOk) return;
  sleep(1);

  const ledger = http.get(
    `${BASE_URL}/api/v1/lots/${DEMO_LOT_ID}/ledger`,
    {
      ...localRequest,
      headers: getAuthHeaders(),
      tags: { name: 'GET /api/v1/lots/:lotId/ledger', step: 'ledger' },
    }
  );
  check(ledger, {
    'ledger returns 200': (response) => response.status === 200,
    'ledger has events and readiness': (response) =>
      Array.isArray(response.json('events')) &&
      Array.isArray(response.json('readiness')),
  });
  sleep(1);
}
