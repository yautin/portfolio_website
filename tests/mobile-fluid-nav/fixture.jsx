import { createRoot } from 'react-dom/client'
import MobileFluidNav from '../../src/components/nav/MobileFluidNav'
import '../../src/styles/components/navbar.css'
import '../../src/styles/components/nav-mobile-fluid.css'
import './fixture.css'

createRoot(document.getElementById('root')).render(<>
  <header className="navbar"><MobileFluidNav current="work" /></header>
  <main><a href="#hero" id="outside">Outside navigation</a>
    {['hero', 'work', 'drugs', 'distill', 'contact'].map(id => <section key={id} id={id}>{id}</section>)}
  </main>
</>)
