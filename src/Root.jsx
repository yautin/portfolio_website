import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import App from './App.jsx'
import { TransitionProvider } from './components/PageTransition.jsx'

// Code-split the games hub: Supabase + the hub UI only load when a visitor
// navigates to /fun, so the portfolio landing page stays lean.
const FunPage = lazy(() => import('./fun/FunPage.jsx'))
const PortfolioGate = lazy(() => import('./components/PortfolioGate.jsx'))
const MedicalPortfolio = lazy(() => import('./medical/MedicalPortfolio.jsx'))

const Root = () => (
  <BrowserRouter>
    <TransitionProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/fun"
          element={
            <Suspense fallback={null}>
              <FunPage />
            </Suspense>
          }
        />
        {/* Direct-link access only: deliberately absent from public navigation. */}
        <Route
          path="/medical-portfolio"
          element={
            <Suspense fallback={<main className="portfolio-gate" role="status">Loading portfolio…</main>}>
              <PortfolioGate>
                {({ library, onLock }) => <MedicalPortfolio library={library} onLock={onLock} />}
              </PortfolioGate>
            </Suspense>
          }
        />
      </Routes>
    </TransitionProvider>
  </BrowserRouter>
)

export default Root
