// Independent job boards / aggregators. Unlike an ATS (which belongs to the
// specific employer using it), a job board carries listings from many
// unrelated employers — recognizing one only identifies the platform, it
// never vouches for who posted a given listing on it.
module.exports = [
  { name: 'Indeed', match: /(^|\.)indeed\.com$/ },
  { name: 'LinkedIn', match: /(^|\.)linkedin\.com$/ },
  { name: 'Glassdoor', match: /(^|\.)glassdoor\.com$/ },
  { name: 'ZipRecruiter', match: /(^|\.)ziprecruiter\.com$/ },
  { name: 'Monster', match: /(^|\.)monster\.com$/ },
  { name: 'CareerBuilder', match: /(^|\.)careerbuilder\.com$/ },
  { name: 'SimplyHired', match: /(^|\.)simplyhired\.com$/ },
  { name: 'Dice', match: /(^|\.)dice\.com$/ },
  { name: 'Snagajob', match: /(^|\.)snagajob\.com$/ },
  { name: 'FlexJobs', match: /(^|\.)flexjobs\.com$/ }
];
