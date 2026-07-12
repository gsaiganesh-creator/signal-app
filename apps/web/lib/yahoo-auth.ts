// Yahoo Finance's v10 quoteSummary endpoint started requiring crumb+cookie
// auth (confirmed live: every unauthenticated call now returns 401 "Invalid
// Crumb", for both US and India tickers — this broke fundamentals across
// every route that calls quoteSummary). v8 chart (price/technicals) is
// unaffected — this helper is only needed for quoteSummary calls.
//
// Standard workaround: GET a Yahoo domain to receive a session cookie, use
// that cookie to GET a crumb token, then send both crumb (query param) and
// cookie (header) on the real quoteSummary request. Cached at module scope
// so warm edge-function invocations reuse it instead of paying 2 extra
// round-trips per request.

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; signal-app/1.0)' };

interface CrumbAuth { crumb: string; cookie: string; expiresAt: number }

let cached: CrumbAuth | null = null;

function extractCookie(res: Response): string | null {
  // Edge runtime's Headers.get('set-cookie') joins multiple Set-Cookie
  // headers with ', ' per the Fetch spec — fine here since we only need
  // the name=value pairs, not full cookie attributes, for the next request.
  const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const raw = getSetCookie ? getSetCookie.call(res.headers) : [res.headers.get('set-cookie')].filter(Boolean) as string[];
  if (!raw.length) return null;
  return raw.map(c => c.split(';')[0]).join('; ');
}

async function fetchCrumb(): Promise<CrumbAuth | null> {
  try {
    const cookieRes = await fetch('https://fc.yahoo.com', { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(6000) });
    const cookie = extractCookie(cookieRes);
    if (!cookie) return null;

    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...UA, Cookie: cookie }, signal: AbortSignal.timeout(6000),
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes('Invalid') || crumb.includes('<')) return null;

    return { crumb, cookie, expiresAt: Date.now() + 55 * 60 * 1000 };
  } catch {
    return null;
  }
}

async function getAuth(forceRefresh = false): Promise<CrumbAuth | null> {
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached;
  const fresh = await fetchCrumb();
  cached = fresh;
  return fresh;
}

// Drop-in replacement for `fetch(quoteSummaryUrl, init)` — attaches
// crumb+cookie, retries once with a fresh crumb on 401. Callers build the
// URL without a crumb param; this appends one when auth is available. If
// Yahoo's crumb endpoint itself is unreachable, falls back to a plain
// unauthenticated request (same behavior as before this fix — better than
// hard-failing). `extraInit` is merged in (e.g. Next.js's `next.revalidate`
// for ISR-cached callers) — headers/signal from extraInit are overridden by
// the auth-required ones, everything else passes through untouched.
export async function fetchYahooQuoteSummary(baseUrl: string, extraInit: RequestInit = {}): Promise<Response> {
  const auth = await getAuth();
  const withCrumb = auth ? `${baseUrl}&crumb=${encodeURIComponent(auth.crumb)}` : baseUrl;
  const headers: Record<string, string> = { ...UA };
  if (auth) headers.Cookie = auth.cookie;

  let res = await fetch(withCrumb, { ...extraInit, headers, signal: AbortSignal.timeout(8000) });
  if (res.status === 401 && auth) {
    const fresh = await getAuth(true);
    if (fresh) {
      const retryUrl = `${baseUrl}&crumb=${encodeURIComponent(fresh.crumb)}`;
      res = await fetch(retryUrl, { ...extraInit, headers: { ...UA, Cookie: fresh.cookie }, signal: AbortSignal.timeout(8000) });
    }
  }
  return res;
}
