import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createServer } from 'node:http';
import { once } from 'node:events';

export const password = 'test-only-portfolio-password';
export const secret = 'test-only-session-secret-at-least-32-characters';

// A complete, blank, one-page synthetic PDF. Never copy original samples here.
function syntheticPDF() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\nendstream',
  ];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(text));
    text += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(text);
  text += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  text += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text);
}

export async function createPortfolioFixture(t) {
  const base = process.env.PORTFOLIO_TEST_TMPDIR || join(homedir(), '.hermes/cache/scratch');
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, 'portfolio-fixture-'));
  const cleanup = () => rm(dir, { recursive: true, force: true });
  t?.after(cleanup);
  const pdf = syntheticPDF();
  const thumbnail = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
  const sample = {
    id: 'synthetic-sample', title: 'Synthetic sample', category: 'print',
    format: 'Leaflet', language: 'English', description: 'Synthetic layout for testing only.',
    pages: 1, pageLabel: '1 PDF page', bytes: pdf.length,
    pdfFile: 'synthetic-sample.pdf', thumbnailFile: 'synthetic-sample.webp',
    sha256: createHash('sha256').update(pdf).digest('hex'),
  };
  const catalog = { version: 1, categories: [{ id: 'print', label: 'Print materials' }], samples: [sample] };
  const saveCatalog = (value = catalog) => writeFile(join(dir, 'catalog.json'), JSON.stringify(value));
  await Promise.all([writeFile(join(dir, sample.pdfFile), pdf),
    writeFile(join(dir, sample.thumbnailFile), thumbnail), saveCatalog()]);
  const publicSample = Object.fromEntries(['id', 'title', 'category', 'format', 'language',
    'description', 'pages', 'pageLabel', 'bytes'].map((key) => [key, sample[key]]));
  return { dir, pdf, thumbnail, sample, catalog, saveCatalog, cleanup,
    publicCatalog: { samples: [publicSample], categories: catalog.categories } };
}

export async function createPortfolioServer(t, { env = {}, parsedBody } = {}) {
  const assets = await createPortfolioFixture(t);
  const previous = { ...process.env };
  Object.assign(process.env, {
    NODE_ENV: 'test', PORTFOLIO_PASSWORD: password,
    PORTFOLIO_SESSION_SECRET: secret, PORTFOLIO_ASSET_DIR: assets.dir, ...env,
  });
  t.after(() => { process.env = previous; });
  const { default: handler } = await import(`../../api/medical-portfolio.js?test=${Math.random()}`);
  const server = createServer((req, res) => {
    if (parsedBody !== undefined) req.body = parsedBody;
    Promise.resolve(handler(req, res)).catch((error) => {
      res.statusCode = 500;
      res.end(String(error));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (method = 'GET', { headers = {}, body, query = '' } = {}) => fetch(`${origin}/api/medical-portfolio${query}`, {
    method, headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
  const login = async () => {
    const response = await request('POST', { body: { password } });
    await response.arrayBuffer();
    return { Cookie: response.headers.get('set-cookie').split(';')[0] };
  };
  return { origin, request, login, assets };
}
