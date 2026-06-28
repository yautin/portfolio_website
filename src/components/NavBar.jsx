import { useState, useEffect } from "react";

import { navLinks } from "../constants";

const NavBar = () => {
  // track if the user has scrolled down the page
  const [scrolled, setScrolled] = useState(false);
  // track if the mobile menu is open
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // create an event listener for when the user scrolls
    const handleScroll = () => {
      // check if the user has scrolled down at least 10px
      // if so, set the state to true
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    // add the event listener to the window
    window.addEventListener("scroll", handleScroll);

    // cleanup the event listener when the component is unmounted
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // collapse the mobile menu after a link is tapped
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`navbar ${scrolled ? "scrolled" : "not-scrolled"}`}>
      <div className="inner">
        <a href="#hero" className="logo" onClick={closeMenu}>
          Marco Ng
        </a>

        <nav className="desktop">
          <ul>
            {navLinks.map(({ link, name }) => (
              <li key={name} className="group">
                <a href={link}>
                  <span>{name}</span>
                  <span className="underline" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href="#contact" className="contact-btn group">
          <div className="inner">
            <span>Contact me</span>
          </div>
        </a>

        {/* mobile hamburger toggle */}
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <img src={menuOpen ? "/images/x.svg" : "/images/menu.svg"} alt="" />
        </button>
      </div>

      {/* mobile dropdown menu */}
      <nav className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="menu-inner">
          <ul>
            {navLinks.map(({ link, name }) => (
              <li key={name}>
                <a href={link} onClick={closeMenu}>
                  {name}
                </a>
              </li>
            ))}
            <li>
              <a href="#contact" onClick={closeMenu} className="mobile-contact">
                Contact me
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;
