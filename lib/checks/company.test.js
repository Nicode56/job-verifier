const { test } = require('node:test');
const assert = require('node:assert/strict');
const { websiteReachableCheck } = require('./company');

function mockFetch(byUrl) {
  global.fetch = async (url) => {
    const entry = byUrl(url);
    if (entry.throw) throw entry.throw;
    return {
      ok: entry.status >= 200 && entry.status < 300,
      status: entry.status,
      url,
      text: async () => entry.body || ''
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
