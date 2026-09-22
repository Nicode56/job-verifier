// Small, dependency-free helpers for pulling comparable domains out of
// whatever the user typed (a bare domain, a full URL, or an email address).

function normalizeDomain(input) {
  if (!input) return null;
  let value = String(input).trim().toLowerCase();
  if (!value) return null;
  if (!/^[a-z]+:\/\//.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function toUrl(input) {
  if (!input) return null;
  let value = String(input).trim();
  if (!value) return null;
  if (!/^[a-z]+:\/\//i.test(value)) value = `https://${value}`;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function domainFromEmail(email) {
  if (!email) return null;
  const match = /@([a-z0-9.-]+\.[a-z]{2,})$/i.exec(email.trim());
  return match ? match[1].toLowerCase() : null;
}

// Registrable domain, e.g. "careers.acme.co.uk" -> "acme.co.uk" using a small
// list of common multi-part public suffixes. Not exhaustive (that requires the
// full Public Suffix List), but good enough for comparing recruiter/company
// domains without pulling in a dependency.
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.jp', 'co.nz', 'co.za',
  'com.au', 'net.au', 'org.au', 'com.br', 'com.mx', 'co.in'
]);

function registrableDomain(hostname) {
  if (!hostname) return null;
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_SUFFIXES.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}

function sameOrganization(domainA, domainB) {
  if (!domainA || !domainB) return false;
  return registrableDomain(domainA) === registrableDomain(domainB);
}

module.exports = { normalizeDomain, toUrl, domainFromEmail, registrableDomain, sameOrganization };
