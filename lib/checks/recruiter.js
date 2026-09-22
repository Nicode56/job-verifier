const dns = require('node:dns').promises;
const { check, PASS, WARN, FAIL } = require('../status');
const { domainFromEmail, sameOrganization } = require('../domain');
const FREE_EMAIL_PROVIDERS = require('../freeEmailProviders');

async function emailDomainMatchCheck(email, companyDomain) {
  const emailDomain = domainFromEmail(email);
  if (!emailDomain) {
    return check('recruiter-domain', 'Recruiter email uses company domain', WARN,
      `"${email}" does not look like a valid email address, so it could not be compared to ${companyDomain}.`);
  }
  if (FREE_EMAIL_PROVIDERS.has(emailDomain)) {
    return check('recruiter-domain', 'Recruiter email uses company domain', FAIL,
      `The recruiter's email uses ${emailDomain}, a free consumer webmail provider, rather than ${companyDomain}. Employers overwhelmingly recruit from a company-controlled email domain; correspondence for a real position at this company would not typically originate from a free webmail address.`);
  }
  if (sameOrganization(emailDomain, companyDomain)) {
    return check('recruiter-domain', 'Recruiter email uses company domain', PASS,
      `The recruiter's email domain (${emailDomain}) matches the company's official website domain (${companyDomain}).`);
  }
  return check('recruiter-domain', 'Recruiter email uses company domain', FAIL,
    `The recruiter's email domain (${emailDomain}) does not match the company's official website domain (${companyDomain}). These facts don't line up with correspondence coming from the company itself.`);
}

async function mxRecordCheck(email) {
  const emailDomain = domainFromEmail(email);
  if (!emailDomain) {
    return check('recruiter-mx', 'Recruiter domain can receive mail', WARN,
      `"${email}" does not look like a valid email address, so its domain could not be checked.`);
  }
  try {
    const records = await dns.resolveMx(emailDomain);
    if (records && records.length > 0) {
      return check('recruiter-mx', 'Recruiter domain can receive mail', PASS,
        `${emailDomain} has ${records.length} mail server${records.length === 1 ? '' : 's'} configured (MX records present).`);
    }
    return check('recruiter-mx', 'Recruiter domain can receive mail', FAIL,
      `${emailDomain} has no mail servers configured (no MX records), meaning it cannot actually receive email at all. That's inconsistent with it being used for real recruiting correspondence.`);
  } catch (err) {
    return check('recruiter-mx', 'Recruiter domain can receive mail', FAIL,
      `${emailDomain} has no resolvable mail configuration (${err.code || err.message}). That's inconsistent with it being used for real recruiting correspondence.`);
  }
}

async function mailAuthCheck(email) {
  const emailDomain = domainFromEmail(email);
  if (!emailDomain) {
    return check('recruiter-mail-auth', 'Recruiter domain has mail authentication records', WARN,
      `"${email}" does not look like a valid email address, so its domain could not be checked.`);
  }
  try {
    const [spfRecords, dmarcRecords] = await Promise.all([
      dns.resolveTxt(emailDomain).catch(() => []),
      dns.resolveTxt(`_dmarc.${emailDomain}`).catch(() => [])
    ]);
    const hasSpf = spfRecords.some(r => r.join('').startsWith('v=spf1'));
    const hasDmarc = dmarcRecords.some(r => r.join('').startsWith('v=DMARC1'));
    if (hasSpf && hasDmarc) {
      return check('recruiter-mail-auth', 'Recruiter domain has mail authentication records', PASS,
        `${emailDomain} publishes both SPF and DMARC records, consistent with a domain that manages its own email delivery deliberately.`);
    }
    if (hasSpf || hasDmarc) {
      return check('recruiter-mail-auth', 'Recruiter domain has mail authentication records', WARN,
        `${emailDomain} publishes ${hasSpf ? 'an SPF' : 'a DMARC'} record but not ${hasSpf ? 'DMARC' : 'SPF'}. That's common even for legitimate domains, so it isn't a confirmed problem on its own.`);
    }
    return check('recruiter-mail-auth', 'Recruiter domain has mail authentication records', WARN,
      `${emailDomain} has no SPF or DMARC records published. Many small or legitimate organizations skip these too, so this alone doesn't confirm anything — it's just one fewer signal that this domain's mail is deliberately managed.`);
  } catch (err) {
    return check('recruiter-mail-auth', 'Recruiter domain has mail authentication records', WARN,
      `Mail authentication records for ${emailDomain} could not be checked (${err.code || err.message}).`);
  }
}

const TOLL_FREE_PREFIXES = ['800', '833', '844', '855', '866', '877', '888'];

function normalizePhoneDigits(phone) {
  return (phone || '').replace(/\D/g, '');
}

function phoneFormatCheck(phone, sourceTexts) {
  const digits = normalizePhoneDigits(phone);
  const nanp = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : (digits.length === 10 ? digits : null);

  if (!nanp) {
    return check('recruiter-phone-format', 'Phone number format', WARN,
      `"${phone}" is not a 10-digit North American number, so its format could not be automatically validated. This is common and expected for international numbers.`);
  }

  const areaCode = nanp.slice(0, 3);
  if (TOLL_FREE_PREFIXES.includes(areaCode)) {
    return check('recruiter-phone-format', 'Phone number format', WARN,
      `${phone} is a toll-free number (area code ${areaCode}). Toll-free numbers are shared across many callers and can't be tied to a specific company, so this alone can't confirm or rule out the employer.`);
  }

  const foundOnSite = sourceTexts.some(text => text && normalizePhoneDigits(text).includes(nanp));
  if (foundOnSite) {
    return check('recruiter-phone-format', 'Phone number appears on official company site', PASS,
      `The digits in ${phone} appear on the company's own website content that was checked.`);
  }

  return check('recruiter-phone-format', 'Phone number appears on official company site', WARN,
    `The digits in ${phone} were not found anywhere in the company website or careers page content that was checked. That may simply mean it's a direct extension that isn't published — it isn't proof of anything on its own.`);
}

module.exports = { emailDomainMatchCheck, mxRecordCheck, mailAuthCheck, phoneFormatCheck };
