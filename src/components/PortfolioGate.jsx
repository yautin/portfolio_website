import { useEffect, useState } from 'react'

async function requestPortfolio(method, password) {
  const response = await fetch('/api/medical-portfolio', {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
    ...(method === 'POST' ? {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    } : {}),
  })
  if (!response.ok) {
    const message = response.status === 401
      ? 'Incorrect password. Please try again.'
      : response.status === 429
        ? 'Too many attempts. Please wait 15 minutes before trying again.'
        : 'Portfolio access is temporarily unavailable. Please contact Marco.'
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  const data = await response.json()
  if (method !== 'DELETE' && (
    !Array.isArray(data?.categories) || !data.categories.every((category) =>
      category && typeof category.id === 'string' && typeof category.label === 'string') ||
    !Array.isArray(data?.samples) || !data.samples.every((sample) =>
      sample && ['id', 'title', 'category', 'format', 'description', 'pageLabel'].every((key) => typeof sample[key] === 'string') &&
      Number.isSafeInteger(sample.pages) && sample.pages > 0 && Number.isSafeInteger(sample.bytes) && sample.bytes > 0 &&
      data.categories.some((category) => category.id === sample.category))
  )) {
    const error = new Error('Portfolio access is temporarily unavailable. Please contact Marco.')
    error.status = 502
    throw error
  }
  return data
}

// The server, not browser storage, decides whether access is granted. Its
// HttpOnly session cookie survives refresh without exposing the credential.
export default function PortfolioGate({ children }) {
  const [password, setPassword] = useState('')
  const [library, setLibrary] = useState(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalidPassword, setInvalidPassword] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)

  useEffect(() => {
    let active = true
    requestPortfolio('GET')
      .then((data) => { if (active) setLibrary(data) })
      .catch((failure) => {
        if (active && failure.status !== 401) setError('Portfolio access is temporarily unavailable. Please contact Marco.')
      })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  async function unlock(event) {
    event.preventDefault()
    if (busy || logoutFailed) return
    setBusy(true)
    setError('')
    setInvalidPassword(false)
    try {
      const data = await requestPortfolio('POST', password)
      setLibrary(data)
      setPassword('')
    } catch (failure) {
      setError(failure.status ? failure.message : 'Unable to connect. Please check your connection and try again.')
      setInvalidPassword(failure.status === 401)
    } finally {
      setBusy(false)
    }
  }

  async function lock() {
    setLibrary(null)
    setPassword('')
    setBusy(true)
    setError('')
    setInvalidPassword(false)
    try {
      await requestPortfolio('DELETE')
      setLogoutFailed(false)
    } catch {
      setLogoutFailed(true)
      setError('Could not end the session. Please try again before leaving this device.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <title>Medical writing portfolio | Marco Ng</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      {checking ? (
        <main className="portfolio-gate" role="status">Checking access…</main>
      ) : library ? children({ library, onLock: lock }) : (
        <main className="portfolio-gate">
          <section className="portfolio-gate-card" aria-labelledby="portfolio-title">
            <p className="portfolio-eyebrow">Marco Ng · Private access</p>
            <h1 id="portfolio-title">Medical writing portfolio</h1>
            <p className="portfolio-intro">Selected work, shared by invitation. Enter the password provided with your link.</p>
            <form onSubmit={unlock} aria-busy={busy}>
              <label htmlFor="portfolio-password">Portfolio password</label>
              <input
                id="portfolio-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                disabled={busy}
                aria-invalid={invalidPassword || undefined}
                aria-describedby={error ? 'portfolio-error' : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error && <p id="portfolio-error" className="portfolio-error" role="alert">{error}</p>}
              <button className="portfolio-button" type="submit" disabled={busy || logoutFailed}>
                {busy ? 'Please wait…' : 'Unlock portfolio'}
              </button>
              {logoutFailed && <button className="portfolio-button" type="button" disabled={busy} onClick={lock}>Retry log out</button>}
            </form>
          </section>
        </main>
      )}
    </>
  )
}
