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

module.exports = { stripHtml, contains };
