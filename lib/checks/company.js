const { fetchWithTimeout } = require('../fetchWithTimeout');
const { check, PASS, WARN, FAIL } = require('../status');

const CAREERS_PATHS = [
  '/careers', '/careers/', '/jobs', '/jobs/', '/about/careers',
  '/company/careers', '/careers/jobs', '/join-us', '/work-with-us', '/about-us/careers'
];

async function probe(url) {
  try {
    let res = await fetchWithTimeout(url, { method: 'GET' });
    return { ok: res.ok, status: res.status, finalUrl: res.url, body: res.ok ? await res.text() : null };
  } catch (err) {
    return { ok: false, status: null, error: err.name === 'AbortError' ? 'timed out' : err.message };
  }
}

async function websiteReachableCheck(domain) {
  const httpsResult = await probe(`https://${domain}`);
  if (httpsResult.ok) {
    return {
      result: check('company-reachable', 'Company website reachable', PASS,
        `https://${domain} responded successfully (HTTP ${httpsResult.status}) over a secure (HTTPS) connection.`),
      finalUrl: httpsResult.finalUrl,
      https: true,
      homepageBody: httpsResult.body
    };
  }
  const httpResult = await probe(`http://${domain}`);
  if (httpResult.ok) {
    return {
      result: check('company-reachable', 'Company website reachable', WARN,
        `http://${domain} responded (HTTP ${httpResult.status}), but the site does not serve HTTPS. A legitimate current-day company site is expected to use HTTPS.`),
      finalUrl: httpResult.finalUrl,
      https: false,
      homepageBody: httpResult.body
    };
  }

  // A non-2xx status still proves the domain resolves to a live server —
  // large sites often block automated requests with bot-protection systems
  // (Akamai, Cloudflare, etc.), which looks exactly like this. That's not
  // evidence the domain itself is fake, so it's inconclusive, not a FAIL.
  const respondedStatus = httpsResult.status ?? httpResult.status;
  if (respondedStatus != null) {
    return {
      result: check('company-reachable', 'Company website reachable', WARN,
        `${domain} responded with HTTP ${respondedStatus} rather than a normal success response. This can mean a genuine problem, or it can just mean the site is blocking automated requests (common for large corporate sites) — the two can't be told apart from here.`),
      finalUrl: httpsResult.finalUrl || httpResult.finalUrl || null,
      https: false,
      homepageBody: null
    };
  }

  return {
    result: check('company-reachable', 'Company website reachable', FAIL,
      `Neither https://${domain} nor http://${domain} could be reached (${httpsResult.error || httpResult.error || 'no response'}). The domain provided does not resolve to a working website.`),
    finalUrl: null,
    https: false,
    homepageBody: null
  };
}

function companyNameOnSiteCheck(companyName, homepageBody, domain) {
  if (!homepageBody) {
    return check('company-name-match', 'Company name found on site', WARN,
      `The company website could not be read, so "${companyName}" could not be checked against its content.`);
  }
  const text = homepageBody.replace(/<[^>]+>/g, ' ').toLowerCase();
  if (text.includes(companyName.trim().toLowerCase())) {
    return check('company-name-match', 'Company name found on site', PASS,
      `"${companyName}" appears in the content of ${domain}.`);
  }
  return check('company-name-match', 'Company name found on site', WARN,
    `"${companyName}" was not found in the homepage content of ${domain}. Companies sometimes go by a different legal or brand name than the one used in a job posting, so this is inconclusive on its own.`);
}

async function domainIdentityCheck(domain) {
  try {
    const res = await fetchWithTimeout(`https://rdap.org/domain/${domain}`, {}, 6000);
    if (!res.ok) {
      return check('company-identity', 'Company identity established', WARN,
        `Registration records for ${domain} could not be retrieved (RDAP returned HTTP ${res.status}). This is common for some country-code domains and does not by itself indicate a problem.`);
    }
    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const registration = events.find(e => e.eventAction === 'registration');
    if (!registration || !registration.eventDate) {
      return check('company-identity', 'Company identity established', WARN,
        `Registration date for ${domain} was not available from public registry data.`);
    }
    const registeredAt = new Date(registration.eventDate);
    const ageDays = Math.floor((Date.now() - registeredAt.getTime()) / (1000 * 60 * 60 * 24));
    const registeredStr = registeredAt.toISOString().slice(0, 10);
    if (ageDays < 90) {
      return check('company-identity', 'Company identity established', FAIL,
        `${domain} was registered on ${registeredStr}, only ${ageDays} days ago. Domains used in job-scam campaigns are frequently registered shortly before the scam begins; an established employer's domain is typically much older.`);
    }
    if (ageDays < 365) {
      return check('company-identity', 'Company identity established', WARN,
        `${domain} was registered on ${registeredStr} (${ageDays} days ago). That's not brand-new, but it's still a relatively young domain for an established employer.`);
    }
    const years = (ageDays / 365).toFixed(1);
    return check('company-identity', 'Company identity established', PASS,
      `${domain} was registered on ${registeredStr}, approximately ${years} years ago — consistent with an established organization.`);
  } catch (err) {
    return check('company-identity', 'Company identity established', WARN,
      `Registration records for ${domain} could not be checked (${err.name === 'AbortError' ? 'lookup timed out' : err.message}).`);
  }
}

async function careersPageCheck(domain, homepageBody) {
  // First, see if the homepage itself links to a careers/jobs page.
  let linkedPath = null;
  if (homepageBody) {
    const linkMatch = /href=["']([^"']*\b(?:careers?|jobs?)\b[^"']*)["']/i.exec(homepageBody);
    if (linkMatch) linkedPath = linkMatch[1];
  }

  const candidates = linkedPath ? [linkedPath, ...CAREERS_PATHS] : CAREERS_PATHS;

  for (const path of candidates) {
    const url = path.startsWith('http') ? path : `https://${domain}${path}`;
    const result = await probe(url);
    if (result.ok) {
      return {
        result: check('careers-page', 'Official careers page found', PASS,
          `${result.finalUrl} responded successfully and appears to be the company's own careers/jobs page.`),
        careersUrl: result.finalUrl,
        careersBody: result.body
      };
    }
  }

  return {
    result: check('careers-page', 'Official careers page found', WARN,
      `No careers page was found at common paths on ${domain} (checked ${CAREERS_PATHS.join(', ')}). Many companies host job listings on a separate applicant-tracking-system domain instead, so this alone is not a red flag.`),
    careersUrl: null,
    careersBody: null
  };
}

module.exports = { websiteReachableCheck, companyNameOnSiteCheck, domainIdentityCheck, careersPageCheck };
