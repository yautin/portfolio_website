import { useState } from 'react'

function assetUrl(id, type, download = false) {
  const query = new URLSearchParams({ asset: id, type })
  if (download) query.set('download', '1')
  return `/api/medical-portfolio?${query}`
}

function SampleCard({ sample }) {
  const [previewFailed, setPreviewFailed] = useState(false)
  return (
    <article className="sample-card" aria-labelledby={`sample-${sample.id}`}>
      <div className="sample-preview">
        {previewFailed ? (
          <p className="sample-preview-fallback">Cover preview unavailable</p>
        ) : (
          <img
            src={assetUrl(sample.id, 'thumbnail')}
            alt={`Cover preview: ${sample.title}`}
            loading="lazy"
            decoding="async"
            onError={() => setPreviewFailed(true)}
          />
        )}
        <span className="sample-file-badge">PDF</span>
      </div>
      <div className="sample-details">
        <p className="sample-format">{sample.format}</p>
        <h2 id={`sample-${sample.id}`}>{sample.title}</h2>
        <p className="sample-description">{sample.description}</p>
        <p className="sample-metadata">{sample.pageLabel}<span aria-hidden="true"> · </span>{(sample.bytes / 1_000_000).toFixed(1)} MB</p>
        <div className="sample-actions">
          <a className="sample-view" href={assetUrl(sample.id, 'pdf')} target="_blank" rel="noopener noreferrer" aria-label={`View PDF: ${sample.title} (opens in a new tab)`}>
            View PDF <span aria-hidden="true">↗</span>
          </a>
          <a className="sample-download" href={assetUrl(sample.id, 'pdf', true)} download={`${sample.id}.pdf`} aria-label={`Download: ${sample.title}`}>Download</a>
        </div>
      </div>
    </article>
  )
}

export default function MedicalPortfolio({ library, onLock }) {
  const [category, setCategory] = useState('all')
  const { samples, categories } = library
  const visible = category === 'all' ? samples : samples.filter((sample) => sample.category === category)

  return (
    <main className="medical-portfolio">
      <header className="portfolio-header">
        <p className="portfolio-eyebrow">Marco Ng <span aria-hidden="true">/</span> Medical writing</p>
        <button className="portfolio-button portfolio-lock" type="button" onClick={onLock}>Lock / Log out</button>
      </header>
      <div className="portfolio-heading">
        <p className="portfolio-eyebrow">Private portfolio · Selected work</p>
        <h1>Selected writing samples</h1>
        <p className="portfolio-intro">Medical communications across print and digital formats—from visual detail aids and clinical reference booklets to expert features, meeting highlights and email.</p>
        <div className="portfolio-summary" aria-label="Collection overview">
          <span><strong>{samples.length}</strong> PDF samples</span>
          <span><strong>{categories.length}</strong> collections</span>
        </div>
      </div>
      {samples.length ? (
        <>
          <div className="portfolio-filters" role="group" aria-label="Filter writing samples">
            <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All samples <span>{samples.length}</span></button>
            {categories.map((item) => (
              <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>
                {item.label} <span>{samples.filter((sample) => sample.category === item.id).length}</span>
              </button>
            ))}
          </div>
          <div className="portfolio-results">
            <p role="status" aria-live="polite">Showing {visible.length} of {samples.length} samples</p>
            <p>View in a new tab or download the original PDF.</p>
          </div>
          <div className="sample-grid">
            {visible.map((sample) => <SampleCard key={sample.id} sample={sample} />)}
          </div>
        </>
      ) : (
        <div className="portfolio-empty" role="status">The sample library is currently unavailable. Please contact Marco for access to the files.</div>
      )}
      <footer className="portfolio-footer">
        <p>Shared privately for portfolio review. Samples retain their original content and are not a current prescribing resource.</p>
        <p>Page counts refer to the PDF files and may include print spreads. Tall-format cover previews may be cropped.</p>
      </footer>
    </main>
  )
}
