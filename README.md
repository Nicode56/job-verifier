# Job Verifier

Cross-checks the facts in a job posting (company, position, recruiter, application
method) against the employer's own public web presence, and reports what could and
couldn't be independently confirmed.

This is not a job board and has no AI in the loop — every check is a deterministic
lookup: HTTP reachability, domain registration age (RDAP), DNS mail records, page-text
matching, and known applicant-tracking-system domains.

## Run it

```
npm install
npm start
```

Then open http://localhost:3000.

## What it checks

- **Company** — is the site reachable over HTTPS, does the company name appear on it,
  how old is the domain registration, is there a discoverable careers page.
- **Position** *(if a job title is given)* — does the title/location/requisition ID
  appear on the company's own careers page content.
- **Recruiter** *(if an email/phone is given)* — does the email domain match the
  company's domain (and isn't a free webmail provider), does that domain have mail
  servers configured, does the phone number show up on the company's own site.
- **Application** *(if a posting URL is given)* — is it on the company's own domain or
  a recognized third-party ATS (Greenhouse, Lever, Workday, etc.).

Each check is ✅ verified, ⚠️ unconfirmed (can't be checked either way from public
data), or ❌ flagged (a fact that was checked came back contradicting the posting).
Flags describe *what didn't match* — the tool never claims to know whether a posting
is a scam.
