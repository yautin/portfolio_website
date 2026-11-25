import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createPortfolioFixture, password, secret } from './helpers/portfolio-fixture.js';

const storageURL = 'https://abcdefghijklmnopqrst.supabase.co';
const storageKey = 'sb_secret_synthetic_test_only';
const rpcURL = `${storageURL}/rest/v1/rpc/portfolio_check_rate_limit`;

async function fixture(t, { env = {}, rpc = () => Response.json(0) } = {}) {
  const assets = await createPortfolioFixture(t);
  const previous = process.env;
  process.env = {
    NODE_ENV: 'production', VERCEL: '1', PORTFOLIO_PASSWORD: password,
    PORTFOLIO_SESSION_SECRET: secret, PORTFOLIO_ASSET_DIR: assets.dir,
    PORTFOLIO_STORAGE_URL: storageURL, PORTFOLIO_STORAGE_KEY: storageKey,
    PORTFOLIO_STORAGE_BUCKET: 'synthetic-private', ...env,
  };
  t.after(() => { process.env = previous; });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (url === rpcURL) return rpc(url, options);
    if (url === `${storageURL}/storage/v1/object/authenticated/synthetic-private/catalog.json`) {
      return Response.json(assets.catalog);
    }
    throw new Error('Unexpected outbound request in synthetic test.');
  });
  const { default: handler } = await import(`../api/medical-portfolio.js?rate-test=${Math.random()}`);
  const request = async ({ method = 'POST', body = { password }, headers = {}, ip = '192.0.2.1', instance = handler } = {}) => {
    const response = { headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      end(value) { this.body = JSON.parse(value); } };
    await instance({ method, url: '/api/medical-portfolio', body,
      headers: { host: 'portfolio.example', origin: 'https://portfolio.example',
        'content-type': 'application/json', 'x-vercel-forwarded-for': ip, ...headers },
      socket: { remoteAddress: '192.0.2.254' } }, response);
    return response;
  };
  return { request, calls, assets };
}

test('RPC transport errors and non-200 statuses never fall back to local validation', async (t) => {
  let reply;
  const { request, calls } = await fixture(t, { rpc: () => reply() });
  const failures = [
    ...[201, 202, 301, 302, 307, 400, 401, 403, 404, 429, 500, 503].map((status) => () => Response.json(0, { status })),
    () => new Response(null, { status: 204 }),
    () => new Response('not JSON', { status: 200 }),
    () => { throw new Error('Synthetic upstream failure with sensitive details'); },
    () => { throw new DOMException('Synthetic timeout', 'TimeoutError'); },
  ];
  for (const failure of failures) {
    reply = failure;
    const response = await request();
    assert.equal(response.statusCode, 503);
    assert.equal(response.headers['set-cookie'], undefined);
    assert.deepEqual(response.body, { error: 'Portfolio login is temporarily unavailable.' });
  }
  assert.equal(calls.length, failures.length);
  assert.ok(calls.every(({ url }) => url === rpcURL));
});

test('RPC requests cannot redirect credentials and have a five-second timeout', async (t) => {
  const { request, calls } = await fixture(t);
  const controller = new AbortController();
  const timeout = t.mock.method(AbortSignal, 'timeout', () => controller.signal);
  assert.equal((await request({ body: { password: 'wrong' } })).statusCode, 401);
  const { options } = calls[0];
  assert.equal(options.redirect, 'error');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.signal, controller.signal);
  assert.deepEqual(timeout.mock.calls[0].arguments, [5000]);
});

test('migration creates only the isolated service-role RPC and rate-limit table', async () => {
  const migration = new URL('../supabase/portfolio-rate-limit.sql', import.meta.url);
  const sql = await readFile(migration, 'utf8').catch(() => '');
  assert.match(sql, /create table if not exists public\.portfolio_login_rate_limits/i);
  assert.match(sql, /alter table public\.portfolio_login_rate_limits enable row level security/i);
  assert.match(sql, /revoke all on table public\.portfolio_login_rate_limits from public, anon, authenticated, service_role/i);
  assert.match(sql, /create or replace function public\.portfolio_check_rate_limit\(p_ip_hash text\)/i);
  assert.match(sql, /returns integer[\s\S]*security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /p_ip_hash is null[\s\S]*\^\[0-9a-f\]\{64\}\$/i);
  assert.match(sql, /on conflict \(ip_hash\) do update/i);
  assert.match(sql, /pg_catalog\.clock_timestamp\(\)/i);
  assert.match(sql, /interval '15 minutes'/i);
  assert.match(sql, /attempts <= 10/i);
  assert.match(sql, /delete from public\.portfolio_login_rate_limits/i);
  assert.match(sql, /revoke all on function public\.portfolio_check_rate_limit\(text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.portfolio_check_rate_limit\(text\) to service_role/i);
  const objects = [...new Set(sql.match(/public\.[a-z_]+/g))].sort();
  assert.deepEqual(objects, ['public.portfolio_check_rate_limit', 'public.portfolio_login_rate_limits']);
  assert.doesNotMatch(sql, /\b(?:drop|truncate|alter default privileges)\b/i);
  assert.match(sql, /\bbegin;[\s\S]*\bcommit;/i);
});

test('RPC reserves successes and failures across independent handlers under concurrency', async (t) => {
  // A synthetic shared RPC models decisions only; SQL atomicity needs a live DB smoke test.
  let reservations = 0;
  const { request, calls } = await fixture(t, {
    rpc: () => Response.json(++reservations <= 10 ? 0 : 900),
  });
  const { default: secondInstance } = await import(`../api/medical-portfolio.js?second=${Math.random()}`);
  const responses = await Promise.all(Array.from({ length: 24 }, (_, i) => request({
    body: { password: i % 2 ? 'wrong' : password }, ...(i % 2 ? { instance: secondInstance } : {}),
  })));
  assert.equal(responses.filter(({ statusCode }) => statusCode === 200).length, 5);
  assert.equal(responses.filter(({ statusCode }) => statusCode === 401).length, 5);
  assert.equal(responses.filter(({ statusCode }) => statusCode === 429).length, 14);
  assert.equal(reservations, 24);
  assert.equal(calls.filter(({ url }) => url === rpcURL).length, 24);
});

test('RPC receives only a domain-separated keyed hash and private server authentication', async (t) => {
  const { request, calls } = await fixture(t);
  const expectedHash = (ip, key = secret) => createHmac('sha256', key)
    .update('medical-portfolio-rate-limit-v1\0').update(ip).digest('hex');
  await request({ body: { password: 'wrong' }, headers: { 'x-forwarded-for': '192.0.2.99' } });
  const { options } = calls[0];
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.apikey, storageKey);
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.headers['Content-Profile'], 'public');
  assert.deepEqual(JSON.parse(options.body), { p_ip_hash: expectedHash('192.0.2.1') });
  assert.match(JSON.parse(options.body).p_ip_hash, /^[0-9a-f]{64}$/);
  assert.ok(!options.body.includes(password));
  assert.ok(!options.body.includes('192.0.2.'));
  await request({ body: { password: 'wrong' }, ip: '192.0.2.2' });
  assert.notEqual(calls[1].options.body, options.body);
  process.env.PORTFOLIO_SESSION_SECRET = 'different-synthetic-secret-at-least-32-characters';
  await request({ body: { password: 'wrong' } });
  assert.equal(JSON.parse(calls[2].options.body).p_ip_hash,
    expectedHash('192.0.2.1', process.env.PORTFOLIO_SESSION_SECRET));
});

test('legacy service-role JWT uses apikey and bearer headers', async (t) => {
  const jwt = ['synthetic', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'signature'].join('.');
  const { request, calls } = await fixture(t, { env: { PORTFOLIO_STORAGE_KEY: jwt } });
  assert.equal((await request({ body: { password: 'wrong' } })).statusCode, 401);
  assert.equal(calls[0].options.headers.apikey, jwt);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${jwt}`);
});

test('only a valid platform-overwritten Vercel IP is trusted', async (t) => {
  const { request, calls } = await fixture(t);
  const socketHash = createHmac('sha256', secret).update('medical-portfolio-rate-limit-v1\0')
    .update('192.0.2.254').digest('hex');
  for (const ip of ['not-an-ip', '192.0.2.1, 192.0.2.2', '']) {
    await request({ body: { password: 'wrong' }, ip });
    assert.equal(JSON.parse(calls.at(-1).options.body).p_ip_hash, socketHash);
  }
  for (const env of [{ NODE_ENV: 'test' }, { NODE_ENV: 'production', VERCEL: '0' }]) {
    Object.assign(process.env, env);
    await request({ body: { password: 'wrong' } });
    assert.equal(JSON.parse(calls.at(-1).options.body).p_ip_hash, socketHash);
  }
});

test('any partial or invalid cloud configuration fails closed without outbound requests', async (t) => {
  const { request, calls } = await fixture(t);
  const names = ['PORTFOLIO_STORAGE_URL', 'PORTFOLIO_STORAGE_KEY', 'PORTFOLIO_STORAGE_BUCKET'];
  const baseline = { PORTFOLIO_STORAGE_URL: storageURL, PORTFOLIO_STORAGE_KEY: storageKey,
    PORTFOLIO_STORAGE_BUCKET: 'synthetic-private' };
  const invalid = [
    ...names.flatMap((name) => ['', ' ', undefined].map((value) => ({ ...baseline, [name]: value }))),
    ...names.map((name) => ({ [name]: baseline[name] })),
    ...['http://abcdefghijklmnopqrst.supabase.co', `${storageURL}:443`, `${storageURL}:8443`,
      `${storageURL}/extra`, `${storageURL}?query`, `${storageURL}#fragment`, `${storageURL}.attacker.example`,
      'https://user:pass@abcdefghijklmnopqrst.supabase.co', 'https://127.0.0.1',
      'https://short.supabase.co', ' https://abcdefghijklmnopqrst.supabase.co',
    ].map((url) => ({ ...baseline, PORTFOLIO_STORAGE_URL: url })),
    ...['sb_publishable_synthetic', 'random-key', 'synthetic.eyJyb2xlIjoiYW5vbiJ9.signature',
      'synthetic.eyJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature',
    ].map((key) => ({ ...baseline, PORTFOLIO_STORAGE_KEY: key })),
    ...['../private', 'a/b', 'Bucket', 'a'.repeat(64)].map((bucket) => ({ ...baseline, PORTFOLIO_STORAGE_BUCKET: bucket })),
  ];
  for (const config of invalid) {
    for (const name of names) delete process.env[name];
    for (const [name, value] of Object.entries(config)) if (value !== undefined) process.env[name] = value;
    const response = await request();
    assert.equal(response.statusCode, 503, JSON.stringify(config));
    assert.equal(response.headers['set-cookie'], undefined);
    assert.deepEqual(response.body, { error: 'Portfolio login is temporarily unavailable.' });
  }
  assert.equal(calls.length, 0);
});

test('GET and logout do not call the login RPC even when it is unavailable', async (t) => {
  let unavailable = false;
  const { request, calls } = await fixture(t, { rpc: () => {
    if (unavailable) throw new Error('Unavailable');
    return Response.json(0);
  } });
  const login = await request();
  assert.equal(login.statusCode, 200);
  const cookie = login.headers['set-cookie'].split(';')[0];
  calls.length = 0;
  unavailable = true;
  assert.equal((await request({ method: 'GET', headers: { cookie } })).statusCode, 200);
  assert.equal((await request({ method: 'GET' })).statusCode, 401);
  assert.equal((await request({ method: 'DELETE', headers: { cookie } })).statusCode, 200);
  assert.ok(calls.every(({ url }) => url !== rpcURL));
});

test('same-origin and body validation still reject requests before reserving a login', async (t) => {
  const { request, calls } = await fixture(t);
  assert.equal((await request({ headers: { origin: 'https://attacker.example' } })).statusCode, 403);
  assert.equal((await request({ body: '{' })).statusCode, 400);
  assert.equal((await request({ body: {} })).statusCode, 400);
  assert.equal((await request({ headers: { 'content-type': 'text/plain' } })).statusCode, 415);
  assert.equal((await request({ body: { password, extra: 'x'.repeat(4096) } })).statusCode, 413);
  assert.equal(calls.length, 0);
});

test('local-only mode keeps failure-only quota and never calls the network', async (t) => {
  const { request, calls } = await fixture(t);
  for (const name of ['PORTFOLIO_STORAGE_URL', 'PORTFOLIO_STORAGE_KEY', 'PORTFOLIO_STORAGE_BUCKET']) delete process.env[name];
  for (let i = 0; i < 12; i++) assert.equal((await request()).statusCode, 200);
  for (let i = 0; i < 10; i++) assert.equal((await request({ body: { password: 'wrong' } })).statusCode, 401);
  const limited = await request();
  assert.equal(limited.statusCode, 429);
  assert.ok(Number(limited.headers['retry-after']) > 0);
  assert.equal(calls.length, 0);
});

test('cloud denial happens before password validation and never creates a cookie', async (t) => {
  const { request, calls } = await fixture(t, { rpc: () => Response.json(71) });
  for (const candidate of ['wrong', password]) {
    const response = await request({ body: { password: candidate } });
    assert.equal(response.statusCode, 429);
    assert.equal(response.headers['retry-after'], '71');
    assert.equal(response.headers['set-cookie'], undefined);
  }
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ url }) => url === rpcURL));
});

test('malformed RPC values fail closed rather than allowing or inventing retry headers', async (t) => {
  const invalid = [null, false, true, '', '0', '30', [], [0], {}, { retry_after: 0 }, -1, 0.5, 901];
  let result;
  const { request } = await fixture(t, { rpc: () => Response.json(result) });
  for (const value of invalid) {
    result = value;
    const response = await request();
    assert.equal(response.statusCode, 503, JSON.stringify(value));
    assert.equal(response.headers['set-cookie'], undefined);
    assert.equal(response.headers['retry-after'], undefined);
    assert.deepEqual(response.body, { error: 'Portfolio login is temporarily unavailable.' });
  }
});
