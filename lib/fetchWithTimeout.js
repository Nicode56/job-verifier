async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobVerifier/1.0; +https://localhost)',
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchWithTimeout };
