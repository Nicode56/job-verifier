const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const tls = require('node:tls');
const { checkTlsCertificate } = require('./tlsCertificate');

function mockTlsConnect(behavior) {
  tls.connect = () => {
    const socket = new EventEmitter();
    socket.destroy = () => {};
    socket.authorized = behavior.authorized;
    socket.authorizationError = behavior.authorizationError;
    socket.getPeerCertificate = () => behavior.cert || {};
    setImmediate(() => {
      if (behavior.error) socket.emit('error', behavior.error);
      else if (behavior.timeout) socket.emit('timeout');
      else socket.emit('secureConnect');
    });
    return socket;
  };
}

test('valid, trusted certificate matching the domain -> present + authorized', async () => {
  mockTlsConnect({
    authorized: true,
    cert: { subject: { CN: 'acme.com' }, issuer: { O: 'DigiCert Inc' }, valid_to: 'Jan 1 2027' }
  });
  const result = await checkTlsCertificate('acme.com');
  assert.equal(result.present, true);
  assert.equal(result.authorized, true);
  assert.equal(result.issuer, 'DigiCert Inc');
});

test('certificate present but not authorized (mismatch/self-signed) -> present, not authorized', async () => {
  mockTlsConnect({
    authorized: false,
    authorizationError: new Error('HOSTNAME_MISMATCH'),
    cert: { subject: { CN: 'someone-else.com' }, issuer: { O: 'Fake CA' }, valid_to: 'Jan 1 2027' }
  });
  const result = await checkTlsCertificate('acme.com');
  assert.equal(result.present, true);
  assert.equal(result.authorized, false);
  assert.match(result.authorizationError, /HOSTNAME_MISMATCH/);
});

test('TLS connection fails outright -> not present', async () => {
  mockTlsConnect({ error: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) });
  const result = await checkTlsCertificate('doesnotexist-xyz.com');
  assert.equal(result.present, false);
  assert.equal(result.reason, 'ECONNREFUSED');
});

test('TLS connection times out -> not present', async () => {
  mockTlsConnect({ timeout: true });
  const result = await checkTlsCertificate('slow-xyz.com');
  assert.equal(result.present, false);
  assert.equal(result.reason, 'timed out');
});
