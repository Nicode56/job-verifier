const { check, PASS, WARN } = require('../status');
const { normalizeDomain, sameOrganization } = require('../domain');
const { stripHtml, contains } = require('../textMatch');
const { fetchWithTimeout } = require('../fetchWithTimeout');
const ATS_PROVIDERS = require('../atsProviders');

function platformChecks(jobPostingUrl, postingDomain, companyDomain) {
  if (sameOrganization(postingDomain, companyDomain)) {
    return [
      check('application-platform', 'Application handled on company’s own site', PASS,
        `The job posting URL (${postingDomain}) is on the company's own domain rather than a third-party platform.`)
    ];
  }

  const provider = ATS_PROVIDERS.find(p => p.match.test(postingDomain));
  if (provider) {
    return [
      check('application-platform', 'Application handled through third-party ATS', WARN,
        `The job posting is hosted on ${postingDomain}, a third-party applicant tracking system, rather than the company's own domain. This is normal and widely used — it is not itself a red flag.`),
      check('application-ats', 'ATS recognized', PASS,
        `${postingDomain} belongs to ${provider.name}, a widely used, legitimate applicant tracking platform.`)
    ];
  }

  return [
    check('application-platform', 'Application platform', WARN,
      `The job posting is hosted on ${postingDomain}, which does not match the company's domain and is not a recognized applicant tracking system. That doesn't confirm anything is wrong, but it also can't be verified as belonging to the company.`)
  ];
}

async function postingLiveChecks(jobPostingUrl, jobTitle) {
  let res;
  try {
    res = await fetchWithTimeout(jobPostingUrl, { method: 'GET' });
  } catch (err) {
    return [
      check('application-live', 'Job posting URL is live', WARN,
        `The job posting URL could not be automatically checked (${err.name === 'AbortError' ? 'timed out' : err.message}). Some sites block automated requests, so this is inconclusive rather than a confirmed problem.`)
    ];
  }

  if (!res.ok) {
    return [
      check('application-live', 'Job posting URL is live', WARN,
        `The job posting URL responded with HTTP ${res.status} rather than a normal success response. That may mean the listing has expired or moved, or it may just mean the site blocks automated requests — it can't be told apart from here.`)
    ];
  }

  const results = [
    check('application-live', 'Job posting URL is live', PASS,
      `The job posting URL responded successfully (HTTP ${res.status}).`)
  ];

  if (!jobTitle) {
    return results;
  }

  const body = await res.text();
  const text = stripHtml(body);
  if (contains(text, jobTitle)) {
    results.push(check('application-content-match', 'Posting page matches given job title', PASS,
      `The text "${jobTitle}" appears on the job posting page itself.`));
  } else {
    results.push(check('application-content-match', 'Posting page matches given job title', WARN,
      `The title "${jobTitle}" was not found in the text of the job posting page. Many application pages load their content dynamically with JavaScript, which a plain fetch can't see — so this is inconclusive rather than a confirmed mismatch.`));
  }

  return results;
}

async function applicationChecks(jobPostingUrl, companyDomain, jobTitle) {
  const postingDomain = normalizeDomain(jobPostingUrl);
  if (!postingDomain) {
    return [];
  }

  const live = await postingLiveChecks(jobPostingUrl, jobTitle);
  return [...platformChecks(jobPostingUrl, postingDomain, companyDomain), ...live];
}

module.exports = { applicationChecks };
