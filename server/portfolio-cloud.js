// Server-only Supabase Storage adapter. Never import this module in client code.
const unavailable = () => new Error('Sample unavailable.');

function isServiceRoleJWT(key) {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    // Shape/role screening only; Supabase verifies the signature server-side.
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'service_role';
  } catch {
    return false;
  }
}

export function portfolioCloudConfig() {
  const names = ['PORTFOLIO_STORAGE_URL', 'PORTFOLIO_STORAGE_KEY', 'PORTFOLIO_STORAGE_BUCKET'];
  if (names.every((name) => process.env[name] === undefined)) return null;
  if (names.some((name) => !process.env[name]?.trim())) throw unavailable();
  const url = process.env.PORTFOLIO_STORAGE_URL;
  const key = process.env.PORTFOLIO_STORAGE_KEY;
  const bucket = process.env.PORTFOLIO_STORAGE_BUCKET;
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url)
    || !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(bucket)
    || (!/^sb_secret_[A-Za-z0-9_-]+$/.test(key) && !isServiceRoleJWT(key))) throw unavailable();
  return { url: url.replace(/\/$/, ''), key, bucket };
}

async function storageRequest(config, path, { method = 'GET', body, limit = 1024 * 1024 } = {}) {
  let result;
  let reader;
  try {
    result = await fetch(`${config.url}/storage/v1/${path}`, {
      method, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: { apikey: config.key,
        ...(!config.key.startsWith('sb_secret_') ? { Authorization: `Bearer ${config.key}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (result.status !== 200 || Number(result.headers.get('content-length')) > limit || !result.body) throw unavailable();
    reader = result.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw unavailable();
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, size);
  } catch {
    // Do not expose fetch errors, keys, URLs or upstream response bodies.
    throw unavailable();
  } finally {
    if (reader) await reader.cancel().catch(() => {});
    else if (result?.body) await result.body.cancel().catch(() => {});
  }
}

function signedLocation(config, filename, value) {
  if (typeof value !== 'string' || value.includes(config.key)) throw unavailable();
  const path = `/object/sign/${config.bucket}/${filename}`;
  const prefixes = [path, `/storage/v1${path}`, `${config.url}/storage/v1${path}`];
  const prefix = prefixes.find((candidate) => value.startsWith(`${candidate}?token=`));
  const token = prefix && value.slice(prefix.length + '?token='.length);
  // Reject URL normalization, query injection, credentials and foreign origins.
  // Construct the final URL ourselves; never forward an upstream URL verbatim.
  if (!token || !/^[A-Za-z0-9._-]+$/.test(token)) throw unavailable();
  return `${config.url}/storage/v1${path}?token=${token}`;
}

// Called only with a basename from the validated catalog in portfolio-assets.js.
export async function serveCloudAsset(config, res, filename, download) {
  if (filename.endsWith('.webp')) {
    // Buffer at most 1 MiB before sending headers so errors stay generic.
    const bytes = await storageRequest(config, `object/authenticated/${config.bucket}/${filename}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.end(bytes);
    return;
  }
  const data = await storageJSON(config, `object/sign/${config.bucket}/${filename}`, {
    method: 'POST', body: { expiresIn: 60 }, limit: 16 * 1024,
  });
  const location = signedLocation(config, filename, data?.signedURL)
    + (download ? `&download=${encodeURIComponent(filename)}` : '');
  res.statusCode = 302;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Location', location);
  res.end();
}

async function storageJSON(config, path, options) {
  try {
    return JSON.parse((await storageRequest(config, path, options)).toString('utf8'));
  } catch {
    throw unavailable();
  }
}

export async function loadCloudCatalog(config) {
  return storageJSON(config, `object/authenticated/${config.bucket}/catalog.json`);
}
