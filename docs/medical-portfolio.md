# Private medical portfolio

## Scope and layout

`/medical-portfolio` is a direct-link-only React Router route, absent from the homepage, navbar, footer and sitemap. It is unlisted, not undiscoverable: authentication protects the catalog and file bytes.

The page is a responsive PDF gallery, organised by the formats actually present in the private catalog. Category filters, cover previews, descriptive format labels, PDF page counts and file sizes replace the original placeholder sections. Each card offers **View PDF** in a new tab and **Download**. Page counts describe the PDF files, not printed booklet pagination; some PDFs contain spreads. Tall-format cover thumbnails may show only the top of the page. Original PDF bytes are not edited.

Descriptions identify document formats; they do not certify authorship scope, regulatory approval, clinical accuracy or permission to publish. No new medical efficacy or safety claims are drafted by the gallery.

## Server-only configuration

| Variable | Purpose |
| --- | --- |
| `PORTFOLIO_PASSWORD` | Shared password. Prefer a long, randomly generated value. |
| `PORTFOLIO_SESSION_SECRET` | Independent random signing secret of at least 32 characters. |
| `PORTFOLIO_ASSET_DIR` | Local-only absolute path to a private asset directory **outside the website repository**. |
| `PORTFOLIO_STORAGE_URL` | Production Supabase project HTTPS URL. |
| `PORTFOLIO_STORAGE_KEY` | Server-only Supabase service-role/secret key. Never send it to a browser. |
| `PORTFOLIO_STORAGE_BUCKET` | Private bucket containing the catalog, PDFs and cover previews. |

Set all three storage variables together for cloud delivery; partial configuration fails closed rather than falling back to a local directory. Keep the local directory setting out of Vercel. Production and preview secrets belong in Vercel's secret environment settings, not Git.

Use `.env.local` locally. Never prefix these variables with `VITE_`: that would expose them to client code. Missing authentication settings fail closed. Missing or invalid storage produces an authenticated empty-library state; it never enables public file access.

Generate a new signing secret locally if needed:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not commit the result. Restart Vite after changing environment settings.

## Private local storage

The directory named by `PORTFOLIO_ASSET_DIR` contains:

- `catalog.json`: schema version 1, categories and sample records;
- allowlisted `.pdf` files;
- allowlisted `.webp` cover previews.

The current local source mapping and hashes are recorded in ignored `context/writing-sample-register.json`. The originals remain in their supplied folder; serving copies are stored separately outside this repository. Their identities were checked by SHA-256. Do not move this directory into `public/`, `src/` or the project root. Vite's static file server must not become an alternate way to fetch private materials.

Catalog shape (synthetic example, not a real sample):

```json
{
  "version": 1,
  "categories": [{ "id": "print", "label": "Detail aids & print" }],
  "samples": [{
    "id": "example",
    "title": "Example writing sample",
    "category": "print",
    "format": "Detail aid",
    "language": "",
    "description": "Descriptive format summary only.",
    "pages": 1,
    "pageLabel": "1 PDF page",
    "bytes": 1234,
    "pdfFile": "example.pdf",
    "thumbnailFile": "example.webp",
    "sha256": "<actual SHA-256 of the PDF>"
  }]
}
```

Use measured page counts, file sizes and hashes. The sample is illustrative and must be replaced with real file metadata. Filenames must be safe basenames with the expected extension; IDs must be unique. The server rejects malformed catalogs, unsafe paths, symlinks and non-regular files. API catalog responses omit storage filenames, hashes and absolute paths.

## Authentication and file delivery

- `POST /api/medical-portfolio`: validates the password and returns the catalog with a signed HttpOnly cookie.
- `GET /api/medical-portfolio`: validates the cookie before returning the catalog.
- `GET /api/medical-portfolio?asset=<id>&type=pdf`: authenticated original PDF, inline by default.
- Add `&download=1` for attachment disposition.
- Use `type=thumbnail` for an authenticated WebP cover image.
- `DELETE /api/medical-portfolio`: clears the scoped cookie; the UI removes the gallery immediately.

Every portfolio API file request checks authentication before resolving the ID or touching private storage. Local PDF delivery supports single byte ranges. Cloud PDF delivery redirects to a **60-second signed Supabase URL**, avoiding Vercel's function-response size limit; Supabase serves the original bytes and range requests. The signed URL is a temporary bearer link: someone who obtains it can use it until expiry, even after logout. The API responses are private/no-store with noindex and nosniff headers; paths and arbitrary URLs are not accepted as asset inputs. Signed PDF responses are served by Supabase rather than the API: uploaded objects use zero-age cache metadata, but the live signed endpoint may omit Cache-Control. Do not treat URL expiry or logout as erasing a document already obtained by a browser.

The signed cookie has an eight-hour lifetime, HttpOnly and SameSite=Strict, is scoped to `/api/medical-portfolio`, and is Secure outside explicit development/test mode. Mutating requests require a matching Origin. Changing the password or signing secret invalidates existing cookies when the new configuration is active.

Logout removes this browser's cookie but does not revoke a copied stateless token before expiry/rotation. Already downloaded documents, already rendered previews and already open PDF tabs cannot be recalled. This is a shared-password portfolio, not individual recruiter accounts.

## Development and tests

```sh
npm ci --include=dev
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
# Or, using an existing Chrome installation:
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

The Vite dev middleware executes the same Node API handler. `npm run preview` serves only the static frontend and cannot authenticate or deliver files. Browser tests generate their own private catalog using **synthetic** PDF/WebP fixtures, not client samples. Tests cover catalog filters, mobile/desktop layout, private previews/downloads, refresh/logout, unauthorized requests, malformed catalogs, symlinks and PDF ranges. Local real-sample verification checks every served PDF against its source hash.

Implementation: `src/Root.jsx`, `src/components/PortfolioGate.jsx`, `src/medical/MedicalPortfolio.jsx`, `src/styles/components/medical-portfolio.css`, `api/medical-portfolio.js`, `server/portfolio-assets.js`, and `tools/portfolio-dev.js`.

## Production release requirements

**Cloud delivery uses a private Supabase Storage bucket and a service-role-only login-rate-limit RPC.** A Vercel deployment does not upload local samples automatically. Original PDFs, covers and catalog stay outside Git; upload them through authenticated Storage administration and verify their hashes separately.

Before sharing the live site:

1. Confirm permission to share every sample and remove confidential information where necessary. A shared password is not a substitute for permission.
2. Create a private bucket with no anonymous/authenticated-user read policies. Upload the catalog and allowlisted files; verify every remote PDF's SHA-256 against the original. Never move samples into `public/` or commit them.
3. Apply `supabase/portfolio-rate-limit.sql` as the database owner. It adds only a portfolio-specific RLS-enabled table and a service-role-only RPC. It does not alter gaming data or policies. The shared fixed window permits ten login attempts per hashed IP per fifteen minutes, including correct passwords; failed RPC/configuration checks deny login. Raw IPs are not stored. Local-only mode retains its bounded per-instance failure limiter.
4. Set `PORTFOLIO_PASSWORD`, `PORTFOLIO_SESSION_SECRET`, `PORTFOLIO_STORAGE_URL`, `PORTFOLIO_STORAGE_KEY` and `PORTFOLIO_STORAGE_BUCKET` as server-only Vercel secrets. Deploy the Node API with the frontend. Keep `PORTFOLIO_ASSET_DIR` local.
5. Verify a preview before promoting production: unauthorized catalog/PDF/thumbnail denial, login, every original file hash, previews, download disposition, refresh, PDF ranges and logout. Verify Secure/HttpOnly cookies, API no-store headers and route noindex headers, including `/medical-portfolio/`. Signed URLs expire after sixty seconds; already acquired documents cannot be recalled.
6. Confirm the public site and sitemap contain no link to this route and the browser build contains no real sample metadata, files or secrets. `.vercelignore` additionally excludes secrets, local review artifacts and test files from CLI deployments.
7. Retain the previous deployment ID for rollback. Keep local originals; an application rollback does not remove the private storage library or the isolated rate-limit schema.

Do not run blanket Supabase resets/pushes to deploy this SQL, change unrelated storage policies, or disable Vercel deployment protection. Review dependency advisories separately; feature verification does not certify the entire legacy dependency tree.

No scientific or regulatory approval is implied by file inspection, categorisation, hashing or automated tests.
