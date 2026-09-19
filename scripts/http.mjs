// Shared HTTP helper for the scheduled sync scripts.
//
// Both upstreams (MaxPreps, Google Docs) occasionally reject a request from a
// GitHub Actions runner for reasons that have nothing to do with our code —
// e.g. MaxPreps' WAF answered every request with HTTP 406 on 2026-09-18 and
// the identical requests succeeded minutes later. Retrying a couple of times
// turns those blips into a slower-but-green run instead of a failure email.

export const UA =
  "Mozilla/5.0 (compatible; WHS-Schedules/1.0; +https://whs.wsesu.net) school schedule sync";

// Statuses worth a second try: rate limiting, timeouts, server errors, and the
// bot-block codes upstream WAFs return to datacenter IPs. Everything else
// (401/403 on a doc that isn't shared, 404 on a renamed path) is a real
// problem that retrying would only hide, so it fails on the first response.
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504, 406, 409]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch with bounded retries. Resolves to the Response; throws the last error
// once the attempts are exhausted, so callers keep their existing try/catch.
export async function fetchWithRetry(url, { attempts = 3, baseDelay = 2000, headers = {} } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, ...headers }, redirect: "follow" });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
      lastErr.status = res.status;
      if (!RETRYABLE.has(res.status)) throw lastErr;
    } catch (err) {
      lastErr = err;
      // A non-retryable status was thrown above — don't sit through the backoff.
      if (err.status && !RETRYABLE.has(err.status)) throw err;
    }
    if (attempt < attempts) {
      const delay = baseDelay * attempt; // 2s, then 4s
      console.warn(`  retry ${attempt}/${attempts - 1} in ${delay / 1000}s — ${lastErr.message}`);
      await sleep(delay);
    }
  }
  throw lastErr;
}
