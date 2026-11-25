import assert from 'node:assert/strict';
import test from 'node:test';
import { rm, writeFile, symlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createPortfolioFixture, createPortfolioServer, password } from './helpers/portfolio-fixture.js';

const unavailable = { samples: [], categories: [], unavailable: true };
const assetQuery = '?asset=synthetic-sample&type=pdf';

test('logout clears browser asset access and rotated or expired cookies cannot fetch files', async (t) => {
  const { request, login } = await createPortfolioServer(t);
  const headers = await login();
  const logout = await request('DELETE', { headers });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /portfolio_session=;.*Max-Age=0/);
  const cleared = { Cookie: logout.headers.get('set-cookie').split(';')[0] };
  for (const query of [assetQuery, '?asset=synthetic-sample&type=thumbnail']) {
    for (const cookie of [{}, cleared, { Cookie: 'portfolio_session=forged' }]) {
      const response = await request('GET', { query, headers: cookie });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    }
  }
  process.env.PORTFOLIO_PASSWORD = 'rotated';
  assert.equal((await request('GET', { query: assetQuery, headers })).status, 401);
  process.env.PORTFOLIO_PASSWORD = password;
  const expired = Date.now() + 8 * 60 * 60 * 1000;
  t.mock.method(Date, 'now', () => expired);
  assert.equal((await request('GET', { query: assetQuery, headers })).status, 401);
});

test('missing storage or catalog returns a generic file error after authentication', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  await rm(join(assets.dir, 'catalog.json'));
  for (const directory of [assets.dir, join(assets.dir, 'missing'), '']) {
    process.env.PORTFOLIO_ASSET_DIR = directory;
    const response = await request('GET', { query: assetQuery, headers });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Sample unavailable.' });
  }
});

test('a truncated PDF cannot be served with stale catalog metadata', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  await writeFile(join(assets.dir, assets.sample.pdfFile), assets.pdf.subarray(0, 12));
  const response = await request('GET', { query: assetQuery, headers });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Sample unavailable.' });
});

test('PDF single ranges return exact slices or 416 for invalid ranges', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  const size = assets.pdf.length;
  for (const [range, start, end] of [
    ['bytes=0-9', 0, 9], ['bytes=20-', 20, size - 1],
    ['bytes=-12', size - 12, size - 1], ['bytes=0-99999', 0, size - 1],
    ['bytes=-99999', 0, size - 1], [`bytes=${size - 1}-${size - 1}`, size - 1, size - 1],
  ]) {
    const response = await request('GET', { query: assetQuery, headers: { ...headers, Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('accept-ranges'), 'bytes');
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${size}`);
    assert.equal(response.headers.get('content-length'), String(end - start + 1));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), assets.pdf.subarray(start, end + 1));
  }
  for (const range of ['bytes=1-0', `bytes=${size}-`, 'bytes=-0', 'bytes=-', 'items=0-3',
    'bytes=0-1,4-5', 'bytes=abc-def', 'bytes=9007199254740992-', 'bytes=0-1junk']) {
    const response = await request('GET', { query: assetQuery, headers: { ...headers, Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('content-range'), `bytes */${size}`);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await response.arrayBuffer()).byteLength, 0);
  }
  const thumbnail = await request('GET', { query: '?asset=synthetic-sample&type=thumbnail', headers: { ...headers, Range: 'bytes=0-1' } });
  assert.equal(thumbnail.status, 200);
  assert.deepEqual(Buffer.from(await thumbnail.arrayBuffer()), assets.thumbnail);
});

test('blank optional language is preserved in the catalog', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  assets.catalog.samples[0].language = '';
  await assets.saveCatalog();
  const response = await request('GET', { headers });
  assert.deepEqual(await response.json(), { ...assets.publicCatalog, samples: [{ ...assets.publicCatalog.samples[0], language: '' }] });
});

test('asset resolution rejects unknown, ambiguous, non-GET and unsafe requests', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  const queries = [
    '?asset=unknown&type=pdf', '?asset=synthetic-sample&type=html',
    '?asset=synthetic-sample&type=__proto__', '?asset=synthetic-sample', '?type=pdf',
    '?asset=synthetic-sample&type=pdf&type=thumbnail',
    '?asset=synthetic-sample&asset=unknown&type=pdf',
    ...['../catalog', '/etc/passwd', '..\\secret', 'https://example.com/x', 'synthetic-sample.pdf', '%2e%2e%2fsecret', 'x\u0000'].map((id) => `?asset=${encodeURIComponent(id)}&type=pdf`),
  ];
  for (const query of queries) {
    const response = await request('GET', { query, headers });
    assert.equal(response.status, 404, query);
    assert.deepEqual(await response.json(), { error: 'Sample unavailable.' });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  for (const method of ['POST', 'DELETE', 'HEAD', 'PUT']) {
    const response = await request(method, { query: assetQuery, headers, ...(method === 'POST' ? { body: { password } } : {}) });
    assert.equal(response.status, 405, method);
  }
  await rm(join(assets.dir, assets.sample.pdfFile));
  const missing = await request('GET', { query: assetQuery, headers });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Sample unavailable.' });
});

test('invalid manifests fail closed without revealing fields or filesystem paths', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  const mutations = [
    (c) => { c.version = 2; },
    (c) => { c.samples.push(c.samples[0]); },
    (c) => { c.categories.push(c.categories[0]); },
    (c) => { c.samples[0].pdfFile = '../secret.pdf'; },
    (c) => { c.samples[0].pdfFile = join(assets.dir, 'secret.pdf'); },
    (c) => { c.samples[0].pdfFile = 'synthetic-sample.html'; },
    (c) => { c.samples[0].thumbnailFile = 'synthetic-sample.svg'; },
    (c) => { c.samples[0].id = '../secret'; },
    (c) => { c.samples[0].category = 'unknown'; },
    (c) => { c.samples[0].pages = 1.5; },
    (c) => { c.samples[0].bytes = -1; },
    (c) => { c.samples[0].sha256 = 'invalid'; },
    (c) => { c.samples[0].title = 42; },
    (c) => { delete c.samples[0].pageLabel; },
    (c) => { c.samples = null; },
    (c) => { c.categories = {}; },
  ];
  for (const mutate of mutations) {
    const catalog = structuredClone(assets.catalog);
    mutate(catalog);
    await assets.saveCatalog(catalog);
    const response = await request('GET', { headers });
    assert.deepEqual(await response.json(), unavailable, mutate.toString());
    const asset = await request('GET', { headers, query: assetQuery });
    assert.equal(asset.status, 404, mutate.toString());
    assert.deepEqual(await asset.json(), { error: 'Sample unavailable.' });
  }
});

test('symlinks and non-regular files cannot expose data outside the asset root', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  const outside = await createPortfolioFixture(t);
  for (const filename of [assets.sample.pdfFile, assets.sample.thumbnailFile, 'catalog.json']) {
    await rm(join(assets.dir, filename));
    await symlink(join(outside.dir, filename), join(assets.dir, filename));
    const query = filename.endsWith('.webp') ? '?asset=synthetic-sample&type=thumbnail' : assetQuery;
    const response = await request('GET', { headers, query });
    assert.equal(response.status, 404, filename);
    assert.deepEqual(await response.json(), { error: 'Sample unavailable.' });
    await rm(join(assets.dir, filename));
    if (filename === 'catalog.json') await assets.saveCatalog();
    else await writeFile(join(assets.dir, filename), filename.endsWith('.pdf') ? assets.pdf : assets.thumbnail);
  }
  await rm(join(assets.dir, assets.sample.pdfFile));
  await mkdir(join(assets.dir, assets.sample.pdfFile));
  const response = await request('GET', { headers, query: assetQuery });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Sample unavailable.' });
});

test('authenticated files are byte-identical with private headers and safe dispositions', async (t) => {
  const { request, login, assets } = await createPortfolioServer(t);
  const headers = await login();
  for (const type of ['pdf', 'thumbnail']) {
    for (const download of ['', '&download=1']) {
      const response = await request('GET', { headers, query: `?asset=${assets.sample.id}&type=${type}${download}` });
      assert.equal(response.status, 200);
      const bytes = type === 'pdf' ? assets.pdf : assets.thumbnail;
      assert.equal(response.headers.get('content-type'), type === 'pdf' ? 'application/pdf' : 'image/webp');
      assert.equal(response.headers.get('content-length'), String(bytes.length));
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      const filename = `${assets.sample.id}.${type === 'pdf' ? 'pdf' : 'webp'}`;
      assert.equal(response.headers.get('content-disposition'), `${download ? 'attachment' : 'inline'}; filename="${filename}"; filename*=UTF-8''${filename}`);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
  }
});

test('missing or malformed local catalogs keep valid login available without leaking paths', async (t) => {
  const { request, assets } = await createPortfolioServer(t);
  for (const state of ['unconfigured', 'missing-dir', 'missing-catalog', 'malformed']) {
    process.env.PORTFOLIO_ASSET_DIR = assets.dir;
    if (state === 'unconfigured') delete process.env.PORTFOLIO_ASSET_DIR;
    if (state === 'missing-dir') process.env.PORTFOLIO_ASSET_DIR = join(assets.dir, 'absent');
    if (state === 'missing-catalog') await rm(join(assets.dir, 'catalog.json'));
    if (state === 'malformed') await writeFile(join(assets.dir, 'catalog.json'), '{');
    const login = await request('POST', { body: { password } });
    assert.equal(login.status, 200, state);
    assert.deepEqual(await login.json(), unavailable, state);
    const refresh = await request('GET', { headers: { Cookie: login.headers.get('set-cookie').split(';')[0] } });
    assert.deepEqual(await refresh.json(), unavailable, state);
  }
});

test('authentication precedes any asset or catalog lookup', async (t) => {
  const { request, assets } = await createPortfolioServer(t);
  await rm(join(assets.dir, 'catalog.json'));
  for (const query of ['', assetQuery, '?asset=synthetic-sample&type=thumbnail', '?asset=../secret&type=unknown']) {
    const response = await request('GET', { query });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    assert.equal(response.headers.get('content-disposition'), null);
  }
});
