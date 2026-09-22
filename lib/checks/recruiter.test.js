const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns').promises;
const { mailAuthCheck } = require('./recruiter');

function mockResolveTxt(recordsByDomain) {
  dns.resolveTxt = async (domain) => {
    if (Object.prototype.hasOwnProperty.call(recordsByDomain, domain)) {
      return recordsByDomain[domain];
    }
    const err = new Error('queryTxt ENODATA');
    err.code = 'ENODATA';
    throw err;
  };
}

test('domain with both SPF and DMARC -> PASS', async () => {
  mockResolveTxt({
    'acme.com': [['v=spf1 include:_spf.google.com ~all']],
    '_dmarc.acme.com': [['v=DMARC1; p=reject; rua=mailto:dmarc@acme.com']]
  });
  const result = await mailAuthCheck('recruiter@acme.com');
  assert.equal(result.status, 'pass');
});

test('domain with only SPF -> WARN, not FAIL', async () => {
  mockResolveTxt({ 'acme.com': [['v=spf1 ~all']] });
  const result = await mailAuthCheck('recruiter@acme.com');
  assert.equal(result.status, 'warn');
});

test('domain with only DMARC -> WARN, not FAIL', async () => {
  mockResolveTxt({ '_dmarc.acme.com': [['v=DMARC1; p=none']] });
  const result = await mailAuthCheck('recruiter@acme.com');
  assert.equal(result.status, 'warn');
});

test('domain with neither record -> WARN, not FAIL (absence alone is not a scam signal)', async () => {
  mockResolveTxt({});
  const result = await mailAuthCheck('recruiter@acme.com');
  assert.equal(result.status, 'warn');
});

test('invalid email -> WARN', async () => {
  const result = await mailAuthCheck('not-an-email');
  assert.equal(result.status, 'warn');
});
