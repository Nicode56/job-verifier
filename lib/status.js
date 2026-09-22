const PASS = 'pass';
const WARN = 'warn';
const FAIL = 'fail';

function check(id, label, status, rationale, detail) {
  return { id, label, status, rationale, detail: detail || null };
}

module.exports = { PASS, WARN, FAIL, check };
