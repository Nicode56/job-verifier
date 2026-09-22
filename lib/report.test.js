const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const tls = require('node:tls');
const { generateReport } = require('./report');

function mockFetch({ registeredYearsAgo = 10, careersBody = 'Careers at Acme' } = {}) {
  global.fetch = async (url) => {
    if (url.includes('rdap.org')) {
      const date = new Date();
      date.setFullYear(date.getFullYear() - registeredYearsAgo);
      return {
        ok: true,
        status: 200,
        url,
        json: async () => ({ events: [{ eventAction: 'registration', eventDate: date.toISOString() }] })
      };
    }
    return {
      ok: true,
      status: 200,
      url,
      text: async () => careersBody
    };
  };
}

function mockTls() {
  tls.connect = () => {
    const socket = new EventEmitter();
    socket.destroy = () => {};
    socket.authorized = true;
    socket.getPeerCertificate = () => ({ subject: { CN: 'acme.com' }, issuer: { O: 'Test CA' }, valid_to: 'Jan 1 2027' });
    setImmediate(() => socket.emit('secureConnect'));
    return socket;
  };
}

test('a requisition ID alone (no job title) still produces a Position section', async () => {
  mockFetch({ careersBody: 'Now hiring — requisition REQ-2026-9999' });
  mockTls();
  const report = await generateReport({
    companyName: 'Acme',
    companyWebsite: 'acme.com',
    requisitionId: 'REQ-2026-9999'
  });
  const position = report.sections.find(s => s.name === 'Position');
  assert.ok(position, 'Position section should be present when only a requisition ID is given');
  const reqCheck = position.checks.find(c => c.id === 'position-reqid');
  assert.ok(reqCheck, 'position-reqid check should be present');
  assert.equal(reqCheck.status, 'pass');
});

test('a job location alone (no job title, no requisition ID) still produces a Position section', async () => {
  mockFetch({ careersBody: 'Now hiring in Austin, TX' });
  mockTls();
  const report = await generateReport({
    companyName: 'Acme',
    companyWebsite: 'acme.com',
    jobLocation: 'Austin, TX'
  });
  const position = report.sections.find(s => s.name === 'Position');
  assert.ok(position, 'Position section should be present when only a location is given');
  assert.ok(position.checks.find(c => c.id === 'position-location'));
});

test('no position-related fields at all -> no Position section', async () => {
  mockFetch();
  mockTls();
  const report = await generateReport({ companyName: 'Acme', companyWebsite: 'acme.com' });
  assert.equal(report.sections.find(s => s.name === 'Position'), undefined);
});
