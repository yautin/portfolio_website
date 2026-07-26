import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import App from './App.jsx'

// Code-split the games hub: Supabase + the hub UI only load when a visitor
// navigates to /fun, so the portfolio landing page stays lean.
const FunPage = lazy(() => import('./fun/FunPage.jsx'))

const Root = () => (
  <BrowserRouter>
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
    </Routes>
  </BrowserRouter>
)

export default Root
