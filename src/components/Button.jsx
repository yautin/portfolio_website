const clearPress = (e) => e.currentTarget.removeAttribute('data-pressed');

const Button = ({ text }) => {
  return (
    <a
      href="#work"
      onPointerDown={(e) => {
        if (e.isPrimary && e.pointerType !== 'mouse') e.currentTarget.setAttribute('data-pressed', '');
      }}
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onLostPointerCapture={clearPress}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const target = document.getElementById("work");
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.15;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
      }}
      className="hero-work-link"
    >
      {text}
      <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16M5 13l7 7 7-7" />
      </svg>
    </a>
  );
};

export default Button;
