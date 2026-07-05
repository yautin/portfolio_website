import { useState, useEffect } from "react";

import { navLinks } from "../constants";

const NavBar = () => {
  // track if the user has scrolled down the page
  const [scrolled, setScrolled] = useState(false);
  // track if the mobile menu is open
  const [menuOpen, setMenuOpen] = useState(false);
  // track which section is currently in view (scroll-spy)
  const [activeId, setActiveId] = useState("hero");
  // light / dark theme — seeded from the pre-paint value set in index.html
  const [theme, setTheme] = useState(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "light"
      ? "light"
      : "dark"
  );

  // apply + persist the theme; dark is the default
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

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

        {/* right cluster: theme switch sits directly left of Contact me
            (and directly beside the hamburger on mobile) */}
        <div className="nav-right">
          <button
            type="button"
            className="theme-switch"
            role="switch"
            aria-checked={theme === "light"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            <span className="knob">
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              )}
            </span>
          </button>

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
