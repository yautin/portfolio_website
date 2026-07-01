import { useState, useEffect } from "react";

import { navLinks } from "../constants";

const NavBar = () => {
  // track if the user has scrolled down the page
  const [scrolled, setScrolled] = useState(false);
  // track if the mobile menu is open
  const [menuOpen, setMenuOpen] = useState(false);
  // track which section is currently in view (scroll-spy)
  const [activeId, setActiveId] = useState("hero");

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

  // highlight the nav link for whichever section sits in the mid-viewport band
  useEffect(() => {
    const ids = ["hero", "work", "drugs", "distill", "contact"];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // collapse the mobile menu after a link is tapped
  const closeMenu = () => setMenuOpen(false);

  const isActive = (link) => link === `#${activeId}`;

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
                <a
                  href={link}
                  className={isActive(link) ? "active" : undefined}
                  aria-current={isActive(link) ? "true" : undefined}
                >
                  <span>{name}</span>
                  <span className="underline" />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href="#contact"
          className={`contact-btn group ${isActive("#contact") ? "active" : ""}`}
          aria-current={isActive("#contact") ? "true" : undefined}
        >
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
                <a
                  href={link}
                  onClick={closeMenu}
                  className={isActive(link) ? "active" : undefined}
                  aria-current={isActive(link) ? "true" : undefined}
                >
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
