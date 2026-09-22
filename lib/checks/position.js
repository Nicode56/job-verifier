const { check, PASS, WARN } = require('../status');

function stripHtml(html) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function contains(haystack, needle) {
  if (!haystack || !needle) return false;
  return haystack.includes(needle.trim().toLowerCase());
}

function positionChecks({ jobTitle, jobLocation, requisitionId, careersBody, careersUrl }) {
  const results = [];

  if (!careersBody) {
    results.push(check('position-source', 'Position found on official careers site', WARN,
      'No official careers page was accessible, so the position details below could not be independently checked against the company’s own site.'));
    return results;
  }

  const text = stripHtml(careersBody);

  if (jobTitle) {
    if (contains(text, jobTitle)) {
      results.push(check('position-title', 'Position found on official careers site', PASS,
        `The text "${jobTitle}" appears on the company's own careers page (${careersUrl}).`));
    } else {
      results.push(check('position-title', 'Position found on official careers site', WARN,
        `The title "${jobTitle}" was not found in the text of the careers page that was checked (${careersUrl}). Many careers sites load listings dynamically with JavaScript, which a plain fetch can't see — so this is inconclusive rather than a confirmed mismatch.`));
    }
  }

  if (jobLocation) {
    if (contains(text, jobLocation)) {
      results.push(check('position-location', 'Location matches', PASS,
        `The location "${jobLocation}" appears on the company's careers page content.`));
    } else {
      results.push(check('position-location', 'Location matches', WARN,
        `The location "${jobLocation}" was not found in the careers page content that was checked. This can't be confirmed independently from the site content retrieved.`));
    }
  }

  if (requisitionId) {
    if (contains(text, requisitionId)) {
      results.push(check('position-reqid', 'Requisition number matches', PASS,
        `The requisition/job ID "${requisitionId}" appears on the company's careers page content.`));
    } else {
      results.push(check('position-reqid', 'Requisition number matches', WARN,
        `The requisition/job ID "${requisitionId}" was not found in the careers page content that was checked. This can't be confirmed independently from the site content retrieved.`));
    }
  }

  return results;
}

module.exports = { positionChecks };
