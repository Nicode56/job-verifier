const { test } = require('node:test');
const assert = require('node:assert/strict');
const { websiteReachableCheck, domainIdentityCheck } = require('./company');

function mockFetch(byUrl) {
  global.fetch = async (url) => {
    const entry = byUrl(url);
    if (entry.throw) throw entry.throw;
    return {
      ok: entry.status >= 200 && entry.status < 300,
      status: entry.status,
      url,
      text: async () => entry.body || '',
      json: async () => JSON.parse(entry.body || '{}')
    };
  };
}

test('2xx over HTTPS -> PASS', async () => {
  mockFetch(() => ({ status: 200, body: 'Acme homepage' }));
  const result = await websiteReachableCheck('acme.com');
  assert.equal(result.result.status, 'pass');
});

test('HTTPS fails but HTTP succeeds -> WARN (no HTTPS)', async () => {
  mockFetch((url) => url.startsWith('https') ? { status: 500 } : { status: 200, body: 'ok' });
  const result = await websiteReachableCheck('acme.com');
  assert.equal(result.result.status, 'warn');
});

test('non-2xx on both, but a real status came back -> WARN, not FAIL (bot-protection lookalike, e.g. IBM/Akamai)', async () => {
  mockFetch(() => ({ status: 404 }));
  const result = await websiteReachableCheck('ibm.com');
  assert.equal(result.result.status, 'warn');
  assert.match(result.result.rationale, /HTTP 404/);
});

test('genuine connection failure on both -> FAIL', async () => {
  mockFetch(() => ({ throw: Object.assign(new Error('fetch failed'), { name: 'TypeError' }) }));
  const result = await websiteReachableCheck('doesnotexist-xyz.com');
  assert.equal(result.result.status, 'fail');
});

test('non-2xx response flags possibleBotBlock and the status, for report.js to cross-reference against domain age', async () => {
  mockFetch(() => ({ status: 404 }));
  const result = await websiteReachableCheck('ibm.com');
  assert.equal(result.possibleBotBlock, true);
  assert.equal(result.httpStatus, 404);
});

test('2xx response does not flag possibleBotBlock', async () => {
  mockFetch(() => ({ status: 200, body: 'ok' }));
  const result = await websiteReachableCheck('acme.com');
  assert.equal(result.possibleBotBlock, undefined);
});

test('domainIdentityCheck returns ageDays alongside the check result', async () => {
  mockFetch(() => ({
    status: 200,
    body: JSON.stringify({ events: [{ eventAction: 'registration', eventDate: '2000-01-01T00:00:00Z' }] })
  }));
  const identity = await domainIdentityCheck('acme.com');
  assert.equal(identity.result.status, 'pass');
  assert.ok(identity.ageDays > 365);
});
