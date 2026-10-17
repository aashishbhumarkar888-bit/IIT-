import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

if (!/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(BASE_URL)) {
  throw new Error(
    'This load test only permits a local HTTP server (localhost, 127.0.0.1, or ::1).'
  );
}

const EMAIL = __ENV.K6_EMAIL;
const PASSWORD = __ENV.K6_PASSWORD;
if (!EMAIL || !PASSWORD) {
  throw new Error('Set K6_EMAIL and K6_PASSWORD to run this load test.');
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
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const localRequest = { redirects: 0 };

export default function () {
  const home = http.get(`${BASE_URL}/`, {
    ...localRequest,
    tags: { name: 'GET / (app shell)' },
  });
  check(home, {
    'app shell returns 200': (response) => response.status === 200,
  });
  sleep(1);

  const appEntry = http.get(`${BASE_URL}/src/main.tsx`, {
    ...localRequest,
    tags: { name: 'GET /src/main.tsx (app entry)' },
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
        tags: { name: 'POST /api/auth/login' },
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
      headers: { Authorization: `Bearer ${sessionToken}` },
      tags: { name: 'GET /api/auth/session' },
    });
    const sessionOk = check(session, {
      'session restore returns 200': (response) => response.status === 200,
      'session restore stays authenticated': (response) =>
        response.json('authenticated') === true,
    });
    if (!sessionOk) sessionToken = '';
  }
  sleep(1);

  const dashboard = http.get(`${BASE_URL}/dashboard`, {
    ...localRequest,
    tags: { name: 'GET /dashboard (SPA route)' },
  });
  check(dashboard, {
    'dashboard route returns 200': (response) => response.status === 200,
  });
  sleep(1);
}
