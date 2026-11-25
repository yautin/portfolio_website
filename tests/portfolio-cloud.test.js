import assert from 'node:assert/strict';
import test from 'node:test';
import { portfolioCatalog, servePortfolioAsset } from '../server/portfolio-assets.js';
import { createPortfolioFixture } from './helpers/portfolio-fixture.js';
import { portfolioCloudConfig } from '../server/portfolio-cloud.js';

const config = {
  PORTFOLIO_STORAGE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  PORTFOLIO_STORAGE_KEY: 'sb_secret_synthetic_server_only_key',
  PORTFOLIO_STORAGE_BUCKET: 'medical-portfolio-private',
};
const unavailable = { samples: [], categories: [], unavailable: true };
const legacyKey = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"role":"service_role"}').toString('base64url')}.synthetic-signature`;
const objectURL = (filename) => `${config.PORTFOLIO_STORAGE_URL}/storage/v1/object/authenticated/${config.PORTFOLIO_STORAGE_BUCKET}/${filename}`;
const query = (suffix = '') => new URLSearchParams(`asset=synthetic-sample&type=pdf${suffix}`);
const response = () => ({
  headers: {}, statusCode: 200,
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
  end(body) { this.body = body; this.ended = true; },
});

async function setup(t, env = config) {
  const assets = await createPortfolioFixture(t);
  const previous = { ...process.env };
  for (const key of Object.keys(config)) delete process.env[key];
  Object.assign(process.env, { PORTFOLIO_ASSET_DIR: assets.dir }, env);
  t.after(() => { process.env = previous; });
  const calls = [];
  const state = { reply: () => { throw new Error('Unexpected storage request'); } };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options });
    return state.reply(String(url), options);
  });
  return { assets, calls, state };
}

test('any partial or empty cloud configuration fails closed despite valid local assets', async (t) => {
  const { calls } = await setup(t, {});
  for (const key of Object.keys(config)) {
    for (const value of ['', ' ', config[key]]) {
      process.env[key] = value;
      assert.deepEqual(await portfolioCatalog(), unavailable, key);
      await assert.rejects(servePortfolioAsset({ headers: {} }, response(), query()), /Sample unavailable\./);
      delete process.env[key];
    }
  }
  assert.equal(calls.length, 0);
});

test('cloud catalog is fetched privately and returns only validated public fields', async (t) => {
  const { assets, calls, state } = await setup(t);
  const catalog = structuredClone(assets.catalog);
  catalog.samples[0].title = 'Cloud synthetic sample';
  catalog.samples[0].privateNote = config.PORTFOLIO_STORAGE_KEY;
  catalog.categories[0].privateNote = 'not public';
  catalog.privateNote = 'not public';
  state.reply = () => Response.json(catalog);
  const expected = structuredClone(assets.publicCatalog);
  expected.samples[0].title = 'Cloud synthetic sample';
  assert.deepEqual(await portfolioCatalog(), expected);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, objectURL('catalog.json'));
  assert.equal(calls[0].options.method, 'GET');
  assert.deepEqual(calls[0].options.headers, { apikey: config.PORTFOLIO_STORAGE_KEY });
  assert.equal(calls[0].options.redirect, 'error');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(calls[0].options.cache, 'no-store');
});

test('legacy service-role JWTs use server-only bearer authorization', async (t) => {
  const { assets, calls, state } = await setup(t, { ...config, PORTFOLIO_STORAGE_KEY: legacyKey });
  state.reply = () => Response.json(assets.catalog);
  assert.deepEqual(await portfolioCatalog(), assets.publicCatalog);
  assert.deepEqual(calls[0].options.headers, { apikey: legacyKey, Authorization: `Bearer ${legacyKey}` });
  assert.ok(!JSON.stringify(await portfolioCatalog()).includes(legacyKey));
});

test('storage transport failures reject safely without local fallback or upstream bodies', async (t) => {
  const { assets, state } = await setup(t);
  const failures = [
    () => Response.json(assets.catalog, { status: 403 }),
    () => Response.json(assets.catalog, { status: 302, headers: { Location: 'https://evil.test' } }),
    () => new Response('server-only-upstream-body', { status: 500 }),
    () => { throw new Error(config.PORTFOLIO_STORAGE_KEY); },
    () => new Response('{'),
    () => new Response(JSON.stringify(assets.catalog), { headers: { 'Content-Length': String(1024 * 1024 + 1) } }),
    () => new Response(' '.repeat(1024 * 1024) + JSON.stringify(assets.catalog)),
  ];
  for (const reply of failures) {
    state.reply = reply;
    assert.deepEqual(await portfolioCatalog(), unavailable);
    await assert.rejects(servePortfolioAsset({ headers: {} }, response(), query()), (error) => {
      assert.equal(error.message, 'Sample unavailable.');
      return true;
    });
  }
});

test('PDFs redirect to a 60-second private signed URL without proxying the PDF', async (t) => {
  const { assets, calls, state } = await setup(t);
  const signPath = `/object/sign/${config.PORTFOLIO_STORAGE_BUCKET}/${assets.sample.pdfFile}`;
  state.reply = (url) => url === objectURL('catalog.json')
    ? Response.json(assets.catalog) : Response.json({ signedURL: `${signPath}?token=synthetic-token` });
  const res = response();
  await servePortfolioAsset({ headers: { range: 'bytes=0-9', authorization: 'client-ignored', cookie: 'session-secret' } }, res, query());
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, `${config.PORTFOLIO_STORAGE_URL}/storage/v1${signPath}?token=synthetic-token`);
  assert.equal(res.headers['cache-control'], 'private, no-store');
  assert.equal(res.headers['referrer-policy'], 'no-referrer');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(res.body, undefined);
  assert.equal(res.ended, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `${config.PORTFOLIO_STORAGE_URL}/storage/v1${signPath}`);
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].options.body), { expiresIn: 60 });
  assert.deepEqual(calls[1].options.headers, { apikey: config.PORTFOLIO_STORAGE_KEY, 'Content-Type': 'application/json' });
  assert.equal(calls[1].options.redirect, 'error');
  assert.ok(!JSON.stringify(res).includes(config.PORTFOLIO_STORAGE_KEY));
});

test('signed redirects accept only the exact configured project, bucket and object', async (t) => {
  const { assets, state } = await setup(t);
  const path = `/object/sign/${config.PORTFOLIO_STORAGE_BUCKET}/${assets.sample.pdfFile}`;
  for (const signedURL of [
    `https://evil.test/storage/v1${path}?token=x`, `//evil.test${path}?token=x`,
    `${config.PORTFOLIO_STORAGE_URL}.evil.test/storage/v1${path}?token=x`,
    `http://abcdefghijklmnopqrst.supabase.co/storage/v1${path}?token=x`,
    `https://user:pass@abcdefghijklmnopqrst.supabase.co/storage/v1${path}?token=x`,
    `/object/public/${config.PORTFOLIO_STORAGE_BUCKET}/${assets.sample.pdfFile}?token=x`,
    path.replace(config.PORTFOLIO_STORAGE_BUCKET, 'other-bucket') + '?token=x',
    path.replace(assets.sample.pdfFile, 'other.pdf') + '?token=x',
    path.replace(assets.sample.pdfFile, '%73ynthetic-sample.pdf') + '?token=x',
    `${path}/../${assets.sample.pdfFile}?token=x`, `${path}?token=x#secret`,
    `${path}?token=x&token=y`, `${path}?token=x&download=evil.pdf`,
    `${path}?token=`, path, `${path}?token=${config.PORTFOLIO_STORAGE_KEY}`,
    `${path}?token=x\r\nLocation:evil`, null, {},
  ]) {
    state.reply = (url) => url === objectURL('catalog.json') ? Response.json(assets.catalog) : Response.json({ signedURL });
    const res = response();
    await assert.rejects(servePortfolioAsset({ headers: {} }, res, query()), /Sample unavailable\./);
    assert.equal(res.headers.location, undefined);
    assert.equal(res.ended, undefined);
  }
});

test('downloads append only the validated basename to all supported signed URL forms', async (t) => {
  const { assets, state } = await setup(t);
  const path = `/object/sign/${config.PORTFOLIO_STORAGE_BUCKET}/${assets.sample.pdfFile}`;
  for (const prefix of ['', '/storage/v1', `${config.PORTFOLIO_STORAGE_URL}/storage/v1`]) {
    state.reply = (url) => url === objectURL('catalog.json')
      ? Response.json(assets.catalog) : Response.json({ signedURL: `${prefix}${path}?token=synthetic.token` });
    for (const download of ['1', 'evil.pdf', '0']) {
      const res = response();
      await servePortfolioAsset({ headers: {} }, res, query(`&download=${download}&filename=evil.pdf&bucket=evil`));
      assert.equal(res.statusCode, 302);
      assert.equal(res.headers.location, `${config.PORTFOLIO_STORAGE_URL}/storage/v1${path}?token=synthetic.token${download === '1' ? '&download=synthetic-sample.pdf' : ''}`);
    }
  }
});

test('covers are privately proxied with bounded bytes and safe response headers', async (t) => {
  const { assets, calls, state } = await setup(t);
  state.reply = (url) => url === objectURL('catalog.json') ? Response.json(assets.catalog)
    : new Response(assets.thumbnail, { headers: { 'Content-Type': 'image/webp',
      'Set-Cookie': 'upstream-secret', 'Cache-Control': 'public', 'Content-Disposition': 'attachment; filename=evil.html' } });
  for (const download of ['', '&download=1']) {
    const res = response();
    await servePortfolioAsset({ headers: { range: 'bytes=0-1' } }, res,
      new URLSearchParams(`asset=synthetic-sample&type=thumbnail${download}`));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, assets.thumbnail);
    assert.equal(res.headers['content-type'], 'image/webp');
    assert.equal(res.headers['content-length'], String(assets.thumbnail.length));
    assert.equal(res.headers['cache-control'], 'private, no-store');
    assert.equal(res.headers['content-disposition'], `${download ? 'attachment' : 'inline'}; filename="synthetic-sample.webp"; filename*=UTF-8''synthetic-sample.webp`);
    assert.equal(res.headers['set-cookie'], undefined);
    assert.equal(res.headers.location, undefined);
  }
  assert.equal(calls.length, 4);
  assert.equal(calls[1].url, objectURL(assets.sample.thumbnailFile));
  assert.deepEqual(calls[1].options.headers, { apikey: config.PORTFOLIO_STORAGE_KEY });
});

test('signing failures never set a redirect or reveal upstream data', async (t) => {
  const { assets, state } = await setup(t);
  for (const reply of [
    () => new Response(`secret=${config.PORTFOLIO_STORAGE_KEY}`, { status: 401 }),
    () => Response.json({ signedURL: '/not-used' }, { status: 302 }),
    () => new Response(`invalid-json:${config.PORTFOLIO_STORAGE_KEY}`),
    () => Response.json(null), () => Response.json({}),
    () => new Response('x'.repeat(16 * 1024 + 1)),
    () => { throw new Error('private-upstream-error'); },
  ]) {
    state.reply = (url) => url === objectURL('catalog.json') ? Response.json(assets.catalog) : reply();
    const res = response();
    await assert.rejects(servePortfolioAsset({ headers: {} }, res, query()), (error) => {
      assert.equal(error.message, 'Sample unavailable.');
      return true;
    });
    assert.equal(res.headers.location, undefined);
    assert.equal(res.ended, undefined);
  }
});

test('cloud catalogs reuse local schema validation and never select unlisted objects', async (t) => {
  const { assets, calls, state } = await setup(t);
  for (const mutate of [
    (c) => { c.version = 2; }, (c) => { c.samples.push(c.samples[0]); },
    (c) => { c.categories.push(c.categories[0]); },
    (c) => { c.samples[0].pdfFile = '../private.pdf'; },
    (c) => { c.samples[0].pdfFile = 'https://evil.test/private.pdf'; },
    (c) => { c.samples[0].thumbnailFile = 'synthetic-sample.svg'; },
    (c) => { c.samples[0].id = '../private'; }, (c) => { c.samples[0].category = 'missing'; },
    (c) => { c.samples[0].bytes = -1; }, (c) => { c.samples[0].pages = 1.5; },
    (c) => { c.samples[0].sha256 = 'wrong'; }, (c) => { delete c.samples[0].title; },
    (c) => { c.samples = null; }, (c) => { c.categories = null; },
  ]) {
    const catalog = structuredClone(assets.catalog);
    mutate(catalog);
    state.reply = () => Response.json(catalog);
    assert.deepEqual(await portfolioCatalog(), unavailable);
    await assert.rejects(servePortfolioAsset({ headers: {} }, response(), query()), /Sample unavailable\./);
  }
  state.reply = () => Response.json(assets.catalog);
  for (const value of ['asset=unknown&type=pdf', 'asset=../private&type=pdf',
    'asset=synthetic-sample&type=html', 'asset=synthetic-sample&type=pdf&type=thumbnail',
    'asset=synthetic-sample&asset=unknown&type=pdf', 'asset=synthetic-sample', 'type=pdf']) {
    await assert.rejects(servePortfolioAsset({ headers: {} }, response(), new URLSearchParams(value)), /Sample unavailable\./);
  }
  assert.ok(calls.every(({ url }) => url === objectURL('catalog.json')));
});

test('covers reject failed or oversized responses before any client bytes are sent', async (t) => {
  const { assets, state } = await setup(t);
  for (const reply of [
    () => new Response('private failure', { status: 404 }),
    () => new Response(assets.thumbnail, { headers: { 'Content-Length': String(1024 * 1024 + 1) } }),
    () => new Response(Buffer.alloc(1024 * 1024 + 1), { headers: { 'Content-Length': '1' } }),
  ]) {
    state.reply = (url) => url === objectURL('catalog.json') ? Response.json(assets.catalog) : reply();
    const res = response();
    await assert.rejects(servePortfolioAsset({ headers: {} }, res,
      new URLSearchParams('asset=synthetic-sample&type=thumbnail')), /Sample unavailable\./);
    assert.equal(res.ended, undefined);
    assert.deepEqual(res.headers, {});
  }
  state.reply = (url) => url === objectURL('catalog.json') ? Response.json(assets.catalog) : new Response(Buffer.alloc(1024 * 1024));
  const res = response();
  await servePortfolioAsset({ headers: {} }, res, new URLSearchParams('asset=synthetic-sample&type=thumbnail'));
  assert.equal(res.body.length, 1024 * 1024);
});

test('native fetch timeout covers both response headers and body consumption', async (t) => {
  const { state } = await setup(t);
  const controllers = [];
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    assert.equal(ms, 8000);
    const controller = new AbortController();
    controllers.push(controller);
    return controller.signal;
  });
  state.reply = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('private-timeout-detail')), { once: true });
    controllers.at(-1).abort();
  });
  assert.deepEqual(await portfolioCatalog(), unavailable);
  state.reply = (url, { signal }) => new Response(new ReadableStream({
    start(controller) {
      signal.addEventListener('abort', () => controller.error(new Error('private-stream-detail')), { once: true });
      queueMicrotask(() => controllers.at(-1).abort());
    },
  }));
  assert.deepEqual(await portfolioCatalog(), unavailable);
  assert.ok(controllers.every(({ signal }) => signal.aborted));
});

test('unauthenticated API requests never make a cloud catalog or object request', async (t) => {
  const { calls } = await setup(t);
  Object.assign(process.env, { PORTFOLIO_PASSWORD: 'synthetic-password', PORTFOLIO_SESSION_SECRET: 'synthetic-signing-secret-at-least-32-characters' });
  const { default: handler } = await import('../api/medical-portfolio.js');
  for (const suffix of ['', '?asset=synthetic-sample&type=pdf', '?asset=synthetic-sample&type=thumbnail']) {
    const res = response();
    await handler({ method: 'GET', url: `/api/medical-portfolio${suffix}`, headers: {} }, res);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(JSON.parse(res.body), { error: 'Authentication required.' });
  }
  assert.equal(calls.length, 0);
});

test('terminal newlines cannot bypass config, slug or signed-token validation', async (t) => {
  const { assets, state, calls } = await setup(t);
  for (const key of Object.keys(config)) {
    process.env[key] = `${config[key]}\n`;
    assert.throws(() => portfolioCloudConfig(), /Sample unavailable\./);
    process.env[key] = config[key];
  }
  await assert.rejects(servePortfolioAsset({ headers: {} }, response(),
    new URLSearchParams('asset=synthetic-sample%0A&type=pdf')), /Sample unavailable\./);
  assert.equal(calls.length, 0);
  state.reply = (url) => url === objectURL('catalog.json') ? Response.json(assets.catalog)
    : Response.json({ signedURL: `/object/sign/${config.PORTFOLIO_STORAGE_BUCKET}/synthetic-sample.pdf?token=x\n` });
  await assert.rejects(servePortfolioAsset({ headers: {} }, response(), query()), /Sample unavailable\./);
});

test('cloud configuration restricts origin, bucket and privileged credential shape', async (t) => {
  const { calls } = await setup(t);
  const invalid = {
    PORTFOLIO_STORAGE_URL: ['http://abcdefghijklmnopqrst.supabase.co', 'https://example.com',
      `${config.PORTFOLIO_STORAGE_URL}.evil.test`, `${config.PORTFOLIO_STORAGE_URL}/path`,
      `${config.PORTFOLIO_STORAGE_URL}?x=1`, `${config.PORTFOLIO_STORAGE_URL}#hash`,
      'https://user:pass@abcdefghijklmnopqrst.supabase.co', `${config.PORTFOLIO_STORAGE_URL}:443`,
      ` ${config.PORTFOLIO_STORAGE_URL}`, 'https://127.0.0.1', 'https://abcdefghijklmnopqrst.supabase.co\\evil'],
    PORTFOLIO_STORAGE_BUCKET: ['../private', 'private/bucket', '%2e%2e', ' private', 'x?foo', 'x'.repeat(64)],
    PORTFOLIO_STORAGE_KEY: ['anon', 'sb_publishable_not_server', 'sb_secret_', 'sb_secret_key\r\nInjected: true',
      'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature'],
  };
  for (const [name, values] of Object.entries(invalid)) {
    for (const value of values) {
      Object.assign(process.env, config, { [name]: value });
      assert.throws(() => portfolioCloudConfig(), /Sample unavailable\./, name);
      assert.deepEqual(await portfolioCatalog(), unavailable);
    }
  }
  assert.equal(calls.length, 0);
});
