(function () {
  const homeView = document.getElementById('home');
  const reportView = document.getElementById('report-view');
  const form = document.getElementById('verify-form');
  const formError = document.getElementById('form-error');
  const toggleMoreBtn = document.getElementById('toggle-more');
  const moreFields = document.getElementById('more-fields');
  const reportContent = document.getElementById('report-content');
  const newSearchBtn = document.getElementById('new-search');
  const loadingTemplate = document.getElementById('loading-template');

  const ICONS = { pass: '✓', warn: '?', fail: '✕' };

  toggleMoreBtn.addEventListener('click', () => {
    const isHidden = moreFields.classList.toggle('hidden');
    toggleMoreBtn.textContent = isHidden
      ? '+ Add job posting details (optional, improves results)'
      : '− Hide job posting details';
  });

  newSearchBtn.addEventListener('click', () => {
    reportView.classList.add('hidden');
    homeView.classList.remove('hidden');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.classList.add('hidden');

    const payload = Object.fromEntries(new FormData(form).entries());

    homeView.classList.add('hidden');
    reportView.classList.remove('hidden');
    reportContent.innerHTML = '';
    reportContent.appendChild(loadingTemplate.content.cloneNode(true));

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      renderReport(data, payload);
    } catch (err) {
      reportView.classList.add('hidden');
      homeView.classList.remove('hidden');
      formError.textContent = err.message;
      formError.classList.remove('hidden');
    }
  });

  function renderReport(report, payload) {
    reportContent.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'report-header';
    header.innerHTML = `
      <p class="report-title">Job Verification</p>
      <h2 class="report-subject">${escapeHtml(payload.companyName)} <span class="domain">(${escapeHtml(report.domain)})</span></h2>
    `;
    reportContent.appendChild(header);

    const verdict = document.createElement('div');
    verdict.className = `verdict ${report.verdict.level}`;
    verdict.innerHTML = `
      <p class="verdict-label">${escapeHtml(report.verdict.label)}</p>
      <p class="verdict-summary">${escapeHtml(report.verdict.summary)}</p>
    `;
    reportContent.appendChild(verdict);

    report.sections.forEach((section) => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'section';

      const heading = document.createElement('p');
      heading.className = 'section-name';
      heading.textContent = section.name;
      sectionEl.appendChild(heading);

      section.checks.forEach((c) => {
        sectionEl.appendChild(renderCheckRow(c));
      });

      reportContent.appendChild(sectionEl);
    });

    const disclaimer = document.createElement('p');
    disclaimer.className = 'disclaimer';
    disclaimer.textContent = 'This report reflects only facts that could be independently checked at the time it was generated (site reachability, domain registration records, public page content, and email/domain matching). A "verified" result confirms consistency with public information, not that the position or company is free of risk. A flagged result means specific facts did not match — it is not a determination that the posting is fraudulent. Always independently confirm recruiter contact details before sharing personal information.';
    reportContent.appendChild(disclaimer);
  }

  function renderCheckRow(c) {
    const row = document.createElement('div');
    row.className = 'check-row';

    const summary = document.createElement('button');
    summary.type = 'button';
    summary.className = 'check-summary';
    summary.innerHTML = `
      <span class="check-icon ${c.status}">${ICONS[c.status]}</span>
      <span class="check-label">${escapeHtml(c.label)}</span>
      <span class="check-caret">▸</span>
    `;
    summary.addEventListener('click', () => row.classList.toggle('open'));
    row.appendChild(summary);

    const detail = document.createElement('div');
    detail.className = 'check-detail';
    const whyText = c.status === 'pass' ? 'Why was this verified?'
      : c.status === 'fail' ? 'Why was this flagged?'
      : 'Why couldn’t this be confirmed?';
    detail.innerHTML = `<span class="why">${whyText}</span>${escapeHtml(c.rationale)}`;
    row.appendChild(detail);

    return row;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();
