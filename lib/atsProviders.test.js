const { test } = require('node:test');
const assert = require('node:assert/strict');
const ATS_PROVIDERS = require('./atsProviders');

function matchedProvider(hostname) {
  const provider = ATS_PROVIDERS.find(p => p.match.test(hostname));
  return provider ? provider.name : null;
}

// Real-world hostnames each provider's job postings actually appear on.
const REAL_EXAMPLES = [
  ['Greenhouse', 'boards.greenhouse.io'],
  ['Lever', 'jobs.lever.co'],
  ['Workday', 'acme.wd1.myworkdayjobs.com'],
  ['Workday', 'acme.myworkday.com'],
  ['iCIMS', 'careers-acme.icims.com'],
  ['Taleo', 'acme.taleo.net'],
  ['SmartRecruiters', 'careers.smartrecruiters.com'],
  ['Jobvite', 'jobs.jobvite.com'],
  ['BambooHR', 'acme.bamboohr.com'],
  ['Workable', 'apply.workable.com'],
  ['Ashby', 'jobs.ashbyhq.com'],
  ['Breezy HR', 'acme.breezy.hr'],
  ['ADP', 'workforcenow.adp.com'],
  ['SuccessFactors', 'acme.successfactors.com'],
  ['SuccessFactors', 'career5.successfactors.eu'],
  ['UKG/Ultipro', 'recruiting.ultipro.com'],
  ['Paylocity', 'recruiting.paylocity.com'],
  ['JazzHR', 'acme.applytojob.com'],
  ['Recruitee', 'acme.recruitee.com'],
  ['Personio', 'acme.jobs.personio.com'],
  ['Personio', 'acme.jobs.personio.de'],
];

for (const [expected, hostname] of REAL_EXAMPLES) {
  test(`recognizes real ${expected} hostname: ${hostname}`, () => {
    assert.equal(matchedProvider(hostname), expected);
  });
}

// Domains that are NOT the real platform but end in the same suffix — the
// kind of lookalike a scam posting would use. None of these should match.
const LOOKALIKE_DOMAINS = [
  'secure-bamboohr.com',
  'fake-workday-myworkdayjobs.com',
  'careers-adp.com',
  'totally-legit-taleo.net',
  'my-successfactors.com',
  'fake-ultipro.com',
  'scam-paylocity.com',
  'phish-applytojob.com',
  'evil-recruitee.com',
  'notpersonio.com',
  'trusted-breezy.hr',
];

for (const hostname of LOOKALIKE_DOMAINS) {
  test(`does not recognize lookalike domain: ${hostname}`, () => {
    assert.equal(matchedProvider(hostname), null);
  });
}

test('does not recognize an unrelated domain', () => {
  assert.equal(matchedProvider('example.com'), null);
});
