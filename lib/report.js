const { normalizeDomain } = require('./domain');
const {
  websiteReachableCheck, companyNameOnSiteCheck, domainIdentityCheck, careersPageCheck, certificateCheck
} = require('./checks/company');
const { positionChecks } = require('./checks/position');
const { emailDomainMatchCheck, mxRecordCheck, mailAuthCheck, phoneFormatCheck } = require('./checks/recruiter');
const { applicationChecks } = require('./checks/application');
const { FAIL, WARN, check } = require('./status');

class ValidationError extends Error {}

async function generateReport(input) {
  const companyName = (input.companyName || '').trim();
  const domain = normalizeDomain(input.companyWebsite);

  if (!companyName) throw new ValidationError('Company name is required.');
  if (!domain) throw new ValidationError('A valid company website is required (e.g. acme.com).');

  const [companySite, identity, tlsCert] = await Promise.all([
    websiteReachableCheck(domain),
    domainIdentityCheck(domain),
    certificateCheck(domain)
  ]);
  const companyNameCheck = companyNameOnSiteCheck(companyName, companySite.homepageBody, domain);
  const careers = await careersPageCheck(domain, companySite.homepageBody);

  // Cross-reference: an unreadable site (bot-blocked automated request) reads
  // very differently if we independently know the domain is long-established
  // and/or serving a real, trusted certificate, versus having no other
  // signal about it at all.
  let reachableResult = companySite.result;
  if (companySite.possibleBotBlock) {
    const signals = [];
    if (tlsCert.authorized) {
      signals.push('it presents a valid, trusted TLS certificate for this exact domain (proving a real server is live for it, independent of the blocked HTTP response)');
    }
    if (identity.ageDays != null && identity.ageDays >= 365) {
      const years = (identity.ageDays / 365).toFixed(1);
      signals.push(`it has been registered for approximately ${years} years (consistent with an established organization)`);
    }
    if (signals.length) {
      reachableResult = check('company-reachable', 'Company website reachable', WARN,
        `${domain} responded with HTTP ${companySite.httpStatus} rather than a normal success response, so its page content couldn't be read directly. That's inconclusive by itself — but ${signals.join(', and ')}, which makes automated-request blocking (bot protection) a more likely explanation than the domain being fake or inactive.`);
    }
  }

  const sections = [];

  sections.push({
    name: 'Company',
    checks: [reachableResult, companyNameCheck, identity.result, tlsCert.result, careers.result]
  });

  const jobTitle = (input.jobTitle || '').trim();
  if (jobTitle) {
    sections.push({
      name: 'Position',
      checks: positionChecks({
        jobTitle,
        jobLocation: (input.jobLocation || '').trim(),
        requisitionId: (input.requisitionId || '').trim(),
        careersBody: careers.careersBody,
        careersUrl: careers.careersUrl
      })
    });
  }

  const recruiterEmail = (input.recruiterEmail || '').trim();
  const recruiterPhone = (input.recruiterPhone || '').trim();
  if (recruiterEmail || recruiterPhone) {
    const recruiterChecks = [];
    if (recruiterEmail) {
      recruiterChecks.push(await emailDomainMatchCheck(recruiterEmail, domain));
      recruiterChecks.push(await mxRecordCheck(recruiterEmail));
      recruiterChecks.push(await mailAuthCheck(recruiterEmail));
    }
    if (recruiterPhone) {
      recruiterChecks.push(phoneFormatCheck(recruiterPhone, [companySite.homepageBody, careers.careersBody]));
    }
    sections.push({ name: 'Recruiter', checks: recruiterChecks });
  }

  const jobPostingUrl = (input.jobPostingUrl || '').trim();
  if (jobPostingUrl) {
    const appChecks = await applicationChecks(jobPostingUrl, domain, jobTitle);
    if (appChecks.length) sections.push({ name: 'Application', checks: appChecks });
  }

  const allChecks = sections.flatMap(s => s.checks);
  const failCount = allChecks.filter(c => c.status === FAIL).length;
  const warnCount = allChecks.filter(c => c.status === WARN).length;

  let verdict;
  if (failCount >= 2) {
    verdict = {
      level: 'red-flag',
      label: 'Significant red flags',
      summary: 'Multiple verifiable facts about this posting do not match what would be expected from this company. This doesn’t prove the posting is fraudulent, but the specific mismatches below are the kind commonly seen in job scams and are worth resolving directly with the company, through a contact method you find independently, before sharing any personal information.'
    };
  } else if (failCount === 1) {
    verdict = {
      level: 'red-flag',
      label: 'Facts don’t line up',
      summary: 'At least one verifiable fact about this posting does not match this company’s official information. Review the flagged item below and consider confirming it directly with the company through a contact method you find independently.'
    };
  } else if (warnCount > 0) {
    verdict = {
      level: 'moderate',
      label: 'Partially verified',
      summary: 'Nothing checked out as contradictory, but some details could not be independently confirmed from public information. That’s often normal (dynamic sites, unpublished extensions, third-party platforms) — not evidence of a problem — but it means this posting isn’t fully verified either.'
    };
  } else {
    verdict = {
      level: 'strong',
      label: 'Strong verification evidence',
      summary: 'Every fact that could be checked was consistent with this being a genuine posting from this company’s official channels.'
    };
  }

  return {
    domain,
    generatedAt: new Date().toISOString(),
    sections,
    verdict
  };
}

module.exports = { generateReport, ValidationError };
