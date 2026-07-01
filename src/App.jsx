import { useEffect } from 'react'
import Hero from './sections/Hero'
import ShowcaseSection from './sections/ShowcaseSection'
import DrugProducts from './sections/DrugProducts'
import DataDistilled from './sections/DataDistilled'
import KinesinWalk from './components/KinesinWalk'
import Contact from './sections/Contact'
import NavBar from './components/NavBar'

// cheeky lines shown in the tab title while the visitor is on another tab
const awayTitles = [
  '👀 The kinesin misses you',
]

const App = () => {
  // swap the tab title when the page is hidden, restore it when back
  useEffect(() => {
    const original = document.title
    const onVisibilityChange = () => {
      document.title = document.hidden
        ? awayTitles[Math.floor(Math.random() * awayTitles.length)]
        : original
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.title = original
    }
  }, [])

  return (
    <>
      <NavBar />
      <Hero />
      <ShowcaseSection />
      <DrugProducts />
      <DataDistilled />
      <KinesinWalk />
      <Contact />
    </>
  )
}

export default App
