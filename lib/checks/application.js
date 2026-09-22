const { check, PASS, WARN } = require('../status');
const { normalizeDomain, sameOrganization } = require('../domain');
const ATS_PROVIDERS = require('../atsProviders');

function applicationChecks(jobPostingUrl, companyDomain) {
  const postingDomain = normalizeDomain(jobPostingUrl);
  if (!postingDomain) {
    return [];
  }

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

module.exports = { applicationChecks };
