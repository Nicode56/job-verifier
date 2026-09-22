const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withDnsTimeout } = require('./dnsWithTimeout');

test('resolves normally when the underlying promise settles before the timeout', async () => {
  const result = await withDnsTimeout(Promise.resolve(['ok']), 50);
  assert.deepEqual(result, ['ok']);
});

test('rejects with DNS_TIMEOUT when the underlying promise never settles', async () => {
  const neverResolves = new Promise(() => {});
  await assert.rejects(
    () => withDnsTimeout(neverResolves, 30),
    (err) => err.code === 'DNS_TIMEOUT'
  );
});

test('propagates the underlying rejection when it happens before the timeout', async () => {
  const err = new Error('queryMx ENOTFOUND');
  err.code = 'ENOTFOUND';
  await assert.rejects(
    () => withDnsTimeout(Promise.reject(err), 50),
    (e) => e.code === 'ENOTFOUND'
  );
});
