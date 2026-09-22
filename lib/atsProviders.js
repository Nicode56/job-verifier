// Domains belonging to well-known applicant tracking systems / job boards.
// Used only to *recognize* a platform, never to vouch for who is using it.
module.exports = [
  { name: 'Greenhouse', match: /(^|\.)greenhouse\.io$/ },
  { name: 'Lever', match: /(^|\.)lever\.co$/ },
  { name: 'Workday', match: /(^|\.)(myworkdayjobs|myworkday)\.com$/ },
  { name: 'iCIMS', match: /(^|\.)icims\.com$/ },
  { name: 'Taleo', match: /(^|\.)taleo\.net$/ },
  { name: 'SmartRecruiters', match: /(^|\.)smartrecruiters\.com$/ },
  { name: 'Jobvite', match: /(^|\.)jobvite\.com$/ },
  { name: 'BambooHR', match: /(^|\.)bamboohr\.com$/ },
  { name: 'Workable', match: /(^|\.)workable\.com$/ },
  { name: 'Ashby', match: /(^|\.)ashbyhq\.com$/ },
  { name: 'Breezy HR', match: /(^|\.)breezy\.hr$/ },
  { name: 'ADP', match: /(^|\.)adp\.com$/ },
  { name: 'SuccessFactors', match: /(^|\.)successfactors\.(com|eu)$/ },
  { name: 'UKG/Ultipro', match: /(^|\.)ultipro\.com$/ },
  { name: 'Paylocity', match: /(^|\.)paylocity\.com$/ },
  { name: 'JazzHR', match: /(^|\.)applytojob\.com$/ },
  { name: 'Recruitee', match: /(^|\.)recruitee\.com$/ },
  { name: 'Personio', match: /(^|\.)personio\.(com|de)$/ }
];
