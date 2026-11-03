import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test from 'node:test';
import { createPortfolioServer as fixture, password, secret } from './helpers/portfolio-fixture.js';

test('login returns only public catalog metadata and a signed session for refresh', async (t) => {
  const { request, assets } = await fixture(t);
  const response = await request('POST', { body: { password } });
  assert.equal(response.status, 200);
  const content = await response.json();
  assert.deepEqual(content, assets.publicCatalog);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/medical-portfolio/);
  assert.match(cookie, /Max-Age=28800/);
  assert.doesNotMatch(cookie, /Secure/);
  assert.ok(!cookie.includes(password));
  const refresh = await request('GET', { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(refresh.status, 200);
  assert.deepEqual(await refresh.json(), content);
});

test('empty or missing configuration fails closed for GET and POST', async (t) => {
  const { request } = await fixture(t);
  for (const [key, value] of [
    ['PORTFOLIO_PASSWORD', ''], ['PORTFOLIO_PASSWORD', undefined],
    ['PORTFOLIO_PASSWORD', '   '], ['PORTFOLIO_SESSION_SECRET', ''],
    ['PORTFOLIO_SESSION_SECRET', undefined], ['PORTFOLIO_SESSION_SECRET', 'x'.repeat(31)],
    ['PORTFOLIO_SESSION_SECRET', ' '.repeat(32)],
  ]) {
    process.env.PORTFOLIO_PASSWORD = password;
    process.env.PORTFOLIO_SESSION_SECRET = secret;
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    for (const method of ['GET', 'POST']) {
      const response = await request(method, method === 'POST' ? { body: { password: '' } } : {});
      assert.equal(response.status, 503, `${key}: ${String(value)} ${method}`);
      assert.equal(typeof (await response.json()).error, 'string');
      assert.equal(response.headers.get('set-cookie'), null);
    }
  }
});

test('password rotation invalidates an existing signed cookie', async (t) => {
  const { request } = await fixture(t);
  const login = await request('POST', { body: { password } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  process.env.PORTFOLIO_PASSWORD = 'rotated-password';
  assert.equal((await request('GET', { headers: { Cookie: cookie } })).status, 401);
});

test('wrong passwords never establish a session', async (t) => {
  const { request } = await fixture(t);
  for (const candidate of ['', 'wrong', `${password} `]) {
    const response = await request('POST', { body: { password: candidate } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('tampered, malformed, duplicate and expired cookies are rejected', async (t) => {
  const { request } = await fixture(t);
  const login = await request('POST', { body: { password } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const [name, token] = cookie.split('=');
  for (const candidate of [
    `${name}=bad`, `${name}=`, `${name}=${token}.extra`,
    `${name}=${token.slice(0, -1)}!`, `${cookie}; ${cookie}`,
    `${name}=9999999999999999999999999.${token.split('.')[1]}`,
  ]) {
    assert.equal((await request('GET', { headers: { Cookie: candidate } })).status, 401, candidate);
  }
  t.mock.method(Date, 'now', () => new Date('2099-01-01T00:00:00Z').getTime());
  assert.equal((await request('GET', { headers: { Cookie: cookie } })).status, 401);
});

test('state changes require an exact same-origin Origin header', async (t) => {
  const { request, origin } = await fixture(t);
  for (const method of ['POST', 'DELETE']) {
    for (const candidate of ['', 'null', 'https://attacker.example', `${origin}.attacker.example`,
      `${origin}/path`, `${origin}/`, `${origin}?query`, `${origin}, ${origin}`]) {
      const response = await request(method, {
        headers: { Origin: candidate }, ...(method === 'POST' ? { body: { password } } : {}),
      });
      assert.equal(response.status, 403, `${method}: ${candidate}`);
      assert.equal(response.headers.get('set-cookie'), null);
    }
    const response = await fetch(`${origin}/api/medical-portfolio`, {
      method, ...(method === 'POST' ? { body: JSON.stringify({ password }) } : {}),
    });
    assert.equal(response.status, 403, `${method}: missing Origin`);
  }
});

test('production requires HTTPS Origin and always sets Secure cookies', async (t) => {
  const { request, origin } = await fixture(t, { env: { NODE_ENV: 'production' } });
  assert.equal((await request('POST', { body: { password } })).status, 403);
  const response = await request('POST', {
    body: { password }, headers: { Origin: origin.replace('http:', 'https:') },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /; Secure/);
});

test('logout clears the scoped cookie even with missing secrets', async (t) => {
  const { request } = await fixture(t);
  const login = await request('POST', { body: { password } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  delete process.env.PORTFOLIO_PASSWORD;
  delete process.env.PORTFOLIO_SESSION_SECRET;
  const response = await request('DELETE', { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.match(response.headers.get('set-cookie'), /portfolio_session=;.*Max-Age=0/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Path=\/api\/medical-portfolio/);
  process.env.PORTFOLIO_PASSWORD = password;
  process.env.PORTFOLIO_SESSION_SECRET = secret;
  assert.equal((await request('GET', { headers: { Cookie: 'portfolio_session=' } })).status, 401);
});

test('unsupported methods return 405 and Allow, including without config', async (t) => {
  const { request } = await fixture(t);
  delete process.env.PORTFOLIO_PASSWORD;
  for (const method of ['PUT', 'PATCH', 'OPTIONS', 'HEAD']) {
    const response = await request(method);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, POST, DELETE');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
  }
});

test('POST rejects malformed JSON, invalid shapes and non-JSON types safely', async (t) => {
  const { request } = await fixture(t);
  for (const body of ['{', '', 'null', '[]', '{}', '{"password":42}', '{"password":null}']) {
    const response = await request('POST', { body });
    assert.equal(response.status, 400, body);
    assert.equal(typeof (await response.json()).error, 'string');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  const response = await request('POST', {
    body: { password }, headers: { 'Content-Type': 'text/plain' },
  });
  assert.equal(response.status, 415);
});

test('POST accepts Vercel-parsed JSON objects', async (t) => {
  const { request } = await fixture(t, { parsedBody: { password } });
  const response = await request('POST');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).samples.length, 1);
});

test('POST enforces a 4KB byte limit on native streams and parsed objects', async (t) => {
  const { request } = await fixture(t);
  const response = await request('POST', { body: { password, extra: 'x'.repeat(4096) } });
  assert.equal(response.status, 413);
  assert.equal(typeof (await response.json()).error, 'string');
  await t.test('parsed object limit', async (subtest) => {
    const parsed = await fixture(subtest, { parsedBody: { password, extra: 'é'.repeat(2048) } });
    assert.equal((await parsed.request('POST')).status, 413);
  });
});

test('ten failed logins trigger a 15-minute limit, ignoring spoofed proxy IPs', async (t) => {
  const { request } = await fixture(t);
  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal((await request('POST', {
      body: { password: 'wrong' }, headers: { 'X-Forwarded-For': `192.0.2.${attempt}`,
        'X-Vercel-Forwarded-For': `192.0.2.${attempt}` },
    })).status, 401);
  }
  const limited = await request('POST', { body: { password } });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal(limited.headers.get('set-cookie'), null);
  const future = Date.now() + 15 * 60 * 1000 + 1;
  t.mock.method(Date, 'now', () => future);
  assert.equal((await request('POST', { body: { password } })).status, 200);
});

test('production Vercel rate limits are per trusted IP with a bounded capacity', async (t) => {
  const { request, origin } = await fixture(t, { env: { NODE_ENV: 'production', VERCEL: '1' } });
  const attempt = (ip, candidate = 'wrong') => request('POST', {
    body: { password: candidate },
    headers: { Origin: origin.replace('http:', 'https:'), 'X-Vercel-Forwarded-For': ip },
  });
  for (let index = 0; index < 10; index++) assert.equal((await attempt('192.0.2.1')).status, 401);
  assert.equal((await attempt('192.0.2.1', password)).status, 429);
  assert.equal((await attempt('192.0.2.2', password)).status, 200);
  // Fill the documented 1,000-IP budget. No eviction can reset the locked IP.
  for (let index = 0; index < 999; index++) {
    assert.equal((await attempt(`2001:db8::${(index + 1).toString(16)}`)).status, 401);
  }
  assert.equal((await attempt('192.0.2.3')).status, 429);
  assert.equal((await attempt('192.0.2.1', password)).status, 429);
  const future = Date.now() + 15 * 60 * 1000 + 1;
  t.mock.method(Date, 'now', () => future);
  assert.equal((await attempt('192.0.2.3', password)).status, 200);
});

test('GET rejects unauthenticated requests without returning content', async (t) => {
  const { request } = await fixture(t);
  const response = await request();
  assert.equal(response.status, 401);
  assert.equal(typeof (await response.json()).error, 'string');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
});

test('chunked bodies enforce byte limits without dropping the HTTP response', async (t) => {
  const { origin } = await fixture(t);
  const chunked = (body) => new Promise((resolve, reject) => {
    const req = httpRequest(`${origin}/api/medical-portfolio`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked' },
    }, (res) => {
      let text = '';
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on('error', reject);
    req.write(body.slice(0, 100));
    req.end(body.slice(100));
  });
  const prefix = JSON.stringify({ password });
  assert.equal((await chunked(prefix + ' '.repeat(4096 - Buffer.byteLength(prefix)))).status, 200);
  assert.equal((await chunked(prefix + ' '.repeat(4097))).status, 413);
  assert.equal((await chunked(JSON.stringify({ password, extra: 'é'.repeat(2048) }))).status, 413);
});

test('pre-parsed strings and buffers use the same validation', async (t) => {
  for (const parsedBody of [JSON.stringify({ password }), Buffer.from(JSON.stringify({ password }))]) {
    await t.test(typeof parsedBody, async (subtest) => {
      const { request } = await fixture(subtest, { parsedBody });
      assert.equal((await request('POST')).status, 200);
    });
  }
  await t.test('invalid pre-parsed shape', async (subtest) => {
    const { request } = await fixture(subtest, { parsedBody: null });
    assert.equal((await request('POST')).status, 400);
  });
});

test('session expires at exactly eight hours and secret rotation revokes it', async (t) => {
  const { request } = await fixture(t);
  const now = Math.floor(Date.now() / 1000) * 1000;
  let clock = now;
  t.mock.method(Date, 'now', () => clock);
  const login = await request('POST', { body: { password } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const refresh = () => request('GET', { headers: { Cookie: cookie } });
  clock = now + 8 * 60 * 60 * 1000 - 1;
  assert.equal((await refresh()).status, 200);
  clock++;
  assert.equal((await refresh()).status, 401);
  clock = now;
  process.env.PORTFOLIO_SESSION_SECRET = 'a-different-secret-with-at-least-32-characters';
  assert.equal((await refresh()).status, 401);
});

test('an unset environment defaults to HTTPS-only Secure cookies', async (t) => {
  const { request, origin } = await fixture(t);
  delete process.env.NODE_ENV;
  assert.equal((await request('POST', { body: { password } })).status, 403);
  const headers = { Origin: origin.replace('http:', 'https:') };
  const login = await request('POST', { body: { password }, headers });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /; Secure/);
  const logout = await request('DELETE', { headers });
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0; Secure/);
});
