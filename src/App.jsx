import Hero from './sections/Hero'
import ShowcaseSection from './sections/ShowcaseSection'
import DrugProducts from './sections/DrugProducts'
import DataDistilled from './sections/DataDistilled'
import KinesinWalk from './components/KinesinWalk'
import Contact from './sections/Contact'
import NavBar from './components/NavBar'

const App = () => {
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
