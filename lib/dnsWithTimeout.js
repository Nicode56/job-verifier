// dns.promises has no built-in timeout, and some networks silently drop
// certain query types (TXT in particular) instead of returning an error —
// which leaves the underlying lookup hanging indefinitely. This bounds it.
function withDnsTimeout(promise, timeoutMs = 6000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('DNS lookup timed out');
      err.code = 'DNS_TIMEOUT';
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { withDnsTimeout };
