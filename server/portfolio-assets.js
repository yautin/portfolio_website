// Server-only storage: private Supabase when configured, otherwise local files.
// Neither catalog metadata nor original assets are imported into the client.
import { open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { portfolioCloudConfig, loadCloudCatalog, serveCloudAsset } from './portfolio-cloud.js';

const slug = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const unavailable = () => new Error('Sample unavailable.');

function validateCatalog(catalog) {
  if (catalog?.version !== 1 || !Array.isArray(catalog.categories) || !Array.isArray(catalog.samples)) throw unavailable();
  const categories = new Set();
  for (const category of catalog.categories) {
    if (!category || !slug(category.id) || !text(category.label) || categories.has(category.id)) throw unavailable();
    categories.add(category.id);
  }
  const ids = new Set();
  for (const sample of catalog.samples) {
    if (!sample || !slug(sample.id) || ids.has(sample.id) || !categories.has(sample.category)
      || !['title', 'format', 'description', 'pageLabel'].every((key) => text(sample[key]))
      || typeof sample.language !== 'string'
      || !positiveInteger(sample.pages) || !positiveInteger(sample.bytes)
      || sample.pdfFile !== `${sample.id}.pdf` || sample.thumbnailFile !== `${sample.id}.webp`
      || typeof sample.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sample.sha256)) throw unavailable();
    ids.add(sample.id);
  }
  return catalog;
}

// Every name is either the fixed manifest name or a validated manifest basename.
// Refuse ALL file symlinks (including internal ones) and open without following
// links, so a file swapped for a symlink between validation and open fails closed.
async function openRegular(root, filename) {
  const file = await open(join(root, filename), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    if (!(await file.stat()).isFile()) throw unavailable();
    return file;
  } catch (error) {
    await file.close();
    throw error;
  }
}

async function loadCatalog() {
  const cloud = portfolioCloudConfig();
  if (cloud) return { cloud, catalog: validateCatalog(await loadCloudCatalog(cloud)) };
  const configured = process.env.PORTFOLIO_ASSET_DIR;
  if (!configured || !isAbsolute(configured)) throw unavailable();
  const root = await realpath(configured);
  const file = await openRegular(root, 'catalog.json');
  try {
    const catalog = validateCatalog(JSON.parse(await file.readFile('utf8')));
    return { root, catalog };
  } finally {
    await file.close();
  }
}

// Only one byte range is supported; malformed/multipart ranges get 416.
function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const first = Number(match[1]);
  const last = Number(match[2]);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return null;
  const start = match[1] ? first : Math.max(0, size - last);
  const end = match[1] && match[2] ? Math.min(last, size - 1) : size - 1;
  return start <= end && start < size ? { start, end } : null;
}

// Call only after authentication. No user-provided URL/path is ever opened.
export async function servePortfolioAsset(req, res, query) {
  if (query.getAll('asset').length !== 1 || query.getAll('type').length !== 1
    || !slug(query.get('asset')) || !['pdf', 'thumbnail'].includes(query.get('type'))) throw unavailable();
  const { root, catalog, cloud } = await loadCatalog();
  const sample = catalog.samples.find((entry) => entry.id === query.get('asset'));
  if (!sample) throw unavailable();
  const isPDF = query.get('type') === 'pdf';
  const filename = isPDF ? sample.pdfFile : sample.thumbnailFile;
  if (cloud) return serveCloudAsset(cloud, res, filename, query.get('download') === '1');
  const file = await openRegular(root, filename);
  try {
    const { size } = await file.stat();
    if (isPDF && size !== sample.bytes) throw unavailable();
    res.statusCode = 200;
    res.setHeader('Content-Type', isPDF ? 'application/pdf' : 'image/webp');
    res.setHeader('Content-Length', String(size));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Disposition', `${query.get('download') === '1' ? 'attachment' : 'inline'}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    if (isPDF) res.setHeader('Accept-Ranges', 'bytes');
    let range;
    if (isPDF && req.headers.range !== undefined) {
      range = byteRange(req.headers.range, size);
      if (!range) {
        res.statusCode = 416;
        res.setHeader('Content-Range', `bytes */${size}`);
        res.setHeader('Content-Length', '0');
        res.end();
        return;
      }
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
      res.setHeader('Content-Length', String(range.end - range.start + 1));
    }
    await pipeline(file.createReadStream({ autoClose: false, ...range }), res);
  } finally {
    await file.close();
  }
}

export async function portfolioCatalog() {
  try {
    const { catalog } = await loadCatalog();
    return {
      samples: catalog.samples.map(({ id, title, category, format, language, description, pages, pageLabel, bytes }) =>
        ({ id, title, category, format, language, description, pages, pageLabel, bytes })),
      categories: catalog.categories.map(({ id, label }) => ({ id, label })),
    };
  } catch {
    return { samples: [], categories: [], unavailable: true };
  }
}
