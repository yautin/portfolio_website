import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { portfolioCatalog, servePortfolioAsset } from '../server/portfolio-assets.js';
import { portfolioRateLimitConfig, reservePortfolioLogin } from '../server/portfolio-rate-limit.js';

const COOKIE = 'portfolio_session';
const SESSION_SECONDS = 8 * 60 * 60;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_IPS = 1000;
// Local-storage-only, PER-INSTANCE protection. Cloud mode never consults or
// updates this map: the shared database reserves every attempt instead.
// At capacity reject new IPs rather than evicting locked entries.
const failures = new Map();

function clientIP(req) {
  const forwarded = req.headers['x-vercel-forwarded-for'];
  if (!localMode() && process.env.VERCEL === '1' && typeof forwarded === 'string' && isIP(forwarded)) {
    // Trust ONLY Vercel's platform-overwritten header, never x-forwarded-for.
    return forwarded;
  }
  return req.socket?.remoteAddress || 'unknown';
}

function retryAfter(ip) {
  const now = Date.now();
  for (const [key, entry] of failures) {
    if (entry.expires <= now) failures.delete(key);
  }
  const entry = failures.get(ip);
  if (entry?.count >= 10) return Math.max(1, Math.ceil((entry.expires - now) / 1000));
  if (!entry && failures.size >= MAX_TRACKED_IPS) return Math.ceil(FAILURE_WINDOW_MS / 1000);
  return 0;
}

function failedLogin(ip) {
  const entry = failures.get(ip) || { count: 0, expires: Date.now() + FAILURE_WINDOW_MS };
  entry.count++;
  failures.set(ip, entry);
}

function rateLimited(res, seconds) {
  res.setHeader('Retry-After', String(seconds));
  return send(res, 429, { error: 'Too many login attempts. Please try again later.' });
}

function localMode() {
  return ['development', 'test'].includes(process.env.NODE_ENV);
}

function sessionCookie(value, maxAge) {
  return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/api/medical-portfolio; Max-Age=${maxAge}${localMode() ? '' : '; Secure'}`;
}

function sameOrigin(req) {
  try {
    const origin = new URL(req.headers.origin);
    return origin.origin === req.headers.origin
      && origin.host === req.headers.host
      && (origin.protocol === 'https:' || (localMode() && origin.protocol === 'http:'));
  } catch {
    return false;
  }
}

function constantTimeEqual(left, right) {
  const hash = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(left), hash(right));
}

function signature(payload) {
  // Bind the HMAC key to the current password without exposing its hash in cookies.
  const key = createHmac('sha256', process.env.PORTFOLIO_SESSION_SECRET)
    .update('medical-portfolio-session-v1\0').update(process.env.PORTFOLIO_PASSWORD).digest();
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(body));
}

const MAX_BODY_BYTES = 4096;

function bodyError(status) {
  return Object.assign(new Error('Invalid request body.'), { status });
}

async function readBody(req) {
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) throw bodyError(413);
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw bodyError(415);
  }
  let body = req.body;
  if (body === undefined) {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      let bytes = 0;
      const cleanup = () => {
        req.removeListener('data', onData);
        req.removeListener('end', onEnd);
        req.removeListener('error', onError);
        req.removeListener('aborted', onAbort);
      };
      const onError = () => { cleanup(); reject(bodyError(400)); };
      const onAbort = onError;
      const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks)); };
      const onData = (chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > MAX_BODY_BYTES) {
          cleanup();
          // Drain without retaining bytes; do not destroy the socket before the 413.
          req.resume();
          reject(bodyError(413));
        } else chunks.push(buffer);
      };
      req.on('data', onData);
      req.once('end', onEnd);
      req.once('error', onError);
      req.once('aborted', onAbort);
    });
  }
  // Vercel may already have parsed JSON. Enforce Content-Length when present,
  // then serialized byte size; discarded whitespace cannot be measured here.
  const serialized = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  if (Buffer.byteLength(serialized) > MAX_BODY_BYTES) throw bodyError(413);
  if (typeof body === 'string' || Buffer.isBuffer(body)) body = JSON.parse(body.toString());
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.password !== 'string') {
    throw bodyError(400);
  }
  return body;
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  if (['POST', 'DELETE'].includes(req.method) && !sameOrigin(req)) {
    return send(res, 403, { error: 'Same-origin requests are required.' });
  }
  const query = new URL(req.url, 'http://localhost').searchParams;
  const assetRequest = query.has('asset') || query.has('type');
  if (assetRequest && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  if (req.method === 'DELETE') {
    // Stateless logout clears this browser's cookie. A stolen copy remains valid
    // until expiry, or until the password/session secret is rotated.
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    return send(res, 200, { ok: true });
  }
  if (!process.env.PORTFOLIO_PASSWORD?.trim()
    || !process.env.PORTFOLIO_SESSION_SECRET?.trim()
    || process.env.PORTFOLIO_SESSION_SECRET.length < 32) {
    return send(res, 503, { error: 'Portfolio access is not configured.' });
  }
  if (req.method === 'POST') {
    const ip = clientIP(req);
    let cloud;
    try {
      cloud = portfolioRateLimitConfig();
    } catch {
      return send(res, 503, { error: 'Portfolio login is temporarily unavailable.' });
    }
    const initialRetry = cloud ? 0 : retryAfter(ip);
    if (initialRetry) return rateLimited(res, initialRetry);
    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      return send(res, error.status || 400, { error: 'Invalid JSON request body (maximum 4KB).' });
    }
    // Reserve all cloud attempts atomically, including successful passwords.
    // Local-only mode retains its per-instance failed-password counter.
    let retry;
    try {
      retry = cloud ? await reservePortfolioLogin(cloud, ip) : retryAfter(ip);
    } catch {
      return send(res, 503, { error: 'Portfolio login is temporarily unavailable.' });
    }
    if (retry) return rateLimited(res, retry);
    if (constantTimeEqual(body.password, process.env.PORTFOLIO_PASSWORD)) {
      const payload = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
      res.setHeader('Set-Cookie', sessionCookie(`${payload}.${signature(payload)}`, SESSION_SECONDS));
      return send(res, 200, await portfolioCatalog());
    }
    if (!cloud) failedLogin(ip);
  }
  if (req.method === 'GET') {
    const cookies = (req.headers.cookie || '').split(';').map((value) => value.trim())
      .filter((value) => value.startsWith(`${COOKIE}=`));
    const token = cookies.length === 1 ? cookies[0].slice(COOKIE.length + 1) : '';
    if (/^\d{1,12}\.[A-Za-z0-9_-]{43}$/.test(token)) {
      const [payload, signed] = token.split('.');
      if (constantTimeEqual(signature(payload), signed) && Number(payload) > Date.now() / 1000) {
        if (assetRequest) {
          try {
            return await servePortfolioAsset(req, res, query);
          } catch {
            // A disconnected client or mid-stream failure cannot receive JSON.
            if (res.headersSent || res.destroyed) { res.destroy(); return; }
            return send(res, 404, { error: 'Sample unavailable.' });
          }
        }
        return send(res, 200, await portfolioCatalog());
      }
    }
  }
  return send(res, 401, { error: 'Authentication required.' });
}
