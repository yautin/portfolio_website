/**
 * The hero CTA: a brand-gradient pill that scrolls smoothly to the section
 * with ID "counter", with a small offset from the top for better placement.
 */

const Button = ({ text, className, id }) => {
  return (
    <a
      href="#counter"
      onClick={(e) => {
        e.preventDefault(); // stop the link from jumping instantly

        const target = document.getElementById("counter");

        // only scroll if we found the section and an ID is passed in
        // (prevents other instances from scrolling to the top)
        if (target && id) {
          const offset = window.innerHeight * 0.15;
          const top =
            target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }}
      className={`${className ?? ""} cta-wrapper`}
    >
      <div className="cta-button">
        <span className="text">{text}</span>
        {/* circle badge that morphs in on hover; the arrow drops in and bounces */}
        <span className="cta-badge" aria-hidden="true">
          <svg
            className="cta-arrow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v16M5 13l7 7 7-7" />
          </svg>
        </span>
      </div>
    </a>
  );
};

export default Button;
