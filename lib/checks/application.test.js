const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applicationChecks } = require('./application');

function mockFetch(response) {
  global.fetch = async (url) => ({
    ok: response.ok,
    status: response.status,
    url,
    text: async () => response.body || ''
  });
}

function byId(checks) {
  return Object.fromEntries(checks.map(c => [c.id, c]));
}

test('live posting page with matching title -> platform + live + content-match all pass', async () => {
  mockFetch({ ok: true, status: 200, body: '<html><body>Senior Engineer role at Acme</body></html>' });
  const checks = await applicationChecks('https://acme.com/careers/123', 'acme.com', 'Senior Engineer');
  const c = byId(checks);
  assert.equal(c['application-platform'].status, 'pass');
  assert.equal(c['application-live'].status, 'pass');
  assert.equal(c['application-content-match'].status, 'pass');
});

test('posting URL 404s -> flagged as inconclusive (WARN), never FAIL', async () => {
  mockFetch({ ok: false, status: 404 });
  const checks = await applicationChecks('https://boards.greenhouse.io/acme/jobs/123', 'acme.com', 'Senior Engineer');
  const c = byId(checks);
  assert.equal(c['application-live'].status, 'warn');
});

test('title not found in live page content -> inconclusive (WARN), never FAIL', async () => {
  mockFetch({ ok: true, status: 200, body: '<html><body>unrelated content</body></html>' });
  const checks = await applicationChecks('https://acme.com/careers/123', 'acme.com', 'Senior Engineer');
  const c = byId(checks);
  assert.equal(c['application-live'].status, 'pass');
  assert.equal(c['application-content-match'].status, 'warn');
});

test('no job title given -> content-match check is skipped entirely', async () => {
  mockFetch({ ok: true, status: 200, body: '<html><body>whatever</body></html>' });
  const checks = await applicationChecks('https://acme.com/careers/123', 'acme.com', '');
  assert.equal(byId(checks)['application-content-match'], undefined);
});

test('unreachable posting URL -> WARN, not FAIL (could be blocked, not necessarily fake)', async () => {
  global.fetch = async () => { throw new Error('network down'); };
  const checks = await applicationChecks('https://acme.com/careers/123', 'acme.com', 'Senior Engineer');
  const c = byId(checks);
  assert.equal(c['application-live'].status, 'warn');
});
