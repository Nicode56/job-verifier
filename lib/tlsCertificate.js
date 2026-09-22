const tls = require('node:tls');

// Raw TLS handshake, independent of the HTTP layer — proves a real,
// properly configured server is live for this exact domain even when
// bot protection blocks every HTTP request we send it.
function checkTlsCertificate(domain, timeoutMs = 6000) {
  return new Promise((resolve) => {
    let settled = false;
    const socket = tls.connect({
      host: domain,
      port: 443,
      servername: domain,
      rejectUnauthorized: false,
      timeout: timeoutMs
    });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      if (!cert || !cert.subject) {
        finish({ present: false, reason: 'no certificate presented' });
        return;
      }
      finish({
        present: true,
        authorized: socket.authorized === true,
        authorizationError: socket.authorized
          ? null
          : (socket.authorizationError && socket.authorizationError.message) || String(socket.authorizationError || 'not authorized'),
        issuer: (cert.issuer && (cert.issuer.O || cert.issuer.CN)) || 'unknown issuer',
        validTo: cert.valid_to
      });
    });

    socket.once('timeout', () => finish({ present: false, reason: 'timed out' }));
    socket.once('error', (err) => finish({ present: false, reason: err.code || err.message }));
  });
}

module.exports = { checkTlsCertificate };
