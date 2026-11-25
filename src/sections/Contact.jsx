import { useRef, useState } from "react";
import { Link } from "react-router";
import { usePageTransition } from "../components/pageTransitionContext";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ContactGlobe from "../components/ContactGlobe";

import { contactEmail, contactLinks, web3formsKey } from "../constants";
import { FLAGS } from "../config/flags";

gsap.registerPlugin(ScrollTrigger);

const contactFormEnabled = FLAGS.contact.enabled;

const year = new Date().getFullYear();

const Contact = () => {
  const sectionRef = useRef(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  // Honeypot: hidden from people, irresistible to bots. Web3Forms drops any
  // submission where `botcheck` is non-empty, and we don't even send those.
  const [botcheck, setBotcheck] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const { portalTo } = usePageTransition();

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();

    // A filled honeypot means a bot: show the normal success state and send
    // nothing, so the script gets no signal that it was detected.
    if (botcheck) {
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
      return;
    }

    // Until a Web3Forms key is configured, fall back to a pre-filled mail draft.
    // Same predicate the build banner reports on — see src/config/features.js.
    if (!contactFormEnabled) {
      const subject = encodeURIComponent(`Portfolio enquiry from ${form.name}`);
      const body = encodeURIComponent(
        `${form.message}\n\n— ${form.name}\n${form.email}`
      );
      window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: web3formsKey,
          botcheck: "", // second line of defence: Web3Forms rejects non-empty
          subject: `Portfolio enquiry from ${form.name}`,
          from_name: form.name,
          name: form.name,
          email: form.email,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setForm({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  useGSAP(() => {
    gsap.fromTo(
      ".contact-reveal",
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
      }
    );
  }, []);

  return (
    <>
      <section id="contact" ref={sectionRef} className="contact-section section-band is-alt">
        <div className="contact-grid">
          <div className="contact-intro">
            <p className="section-eyebrow contact-reveal">Contact</p>
            <h2 className="section-title contact-reveal">Let&rsquo;s work together</h2>
            <p className="section-lead contact-reveal">
              I help medical and commercial teams turn complex clinical data into
              accurate, compelling content for healthcare professionals — from
              detail aids to symposium highlights.
            </p>

            <p className="contact-status contact-reveal">
              <span className="dot" />
              Currently open to new opportunities
            </p>
          </div>

          <form className="contact-form contact-reveal" onSubmit={onSubmit}>
            {/* Honeypot — off-screen, unfocusable and hidden from assistive
                tech, so only a form-filling bot ever populates it. */}
            <input
              type="text"
              name="botcheck"
              className="contact-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={botcheck}
              onChange={(e) => setBotcheck(e.target.value)}
            />

            <div className="contact-field">
              <label htmlFor="cf-name">Name</label>
              <input
                id="cf-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your name"
                value={form.name}
                onChange={onChange}
              />
            </div>

            <div className="contact-field">
              <label htmlFor="cf-email">Email</label>
              <input
                id="cf-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={onChange}
              />
            </div>

            <div className="contact-field">
              <label htmlFor="cf-message">Message</label>
              <textarea
                id="cf-message"
                name="message"
                rows={5}
                required
                placeholder="Let me know what you need…"
                value={form.message}
                onChange={onChange}
              />
            </div>

            <button
              type="submit"
              className="contact-submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Sending…" : "Send message →"}
            </button>

            <p
              className={`contact-formnote ${status === "success" ? "is-success" : ""
                }${status === "error" ? "is-error" : ""}`}
              aria-live="polite"
            >
              {status === "success"
                ? "Thanks — your message is on its way. I'll reply soon."
                : status === "error"
                  ? `Something went wrong. Please email me at ${contactEmail}.`
                  : "I usually reply within a couple of days."}
            </p>
          </form>

          <div className="contact-details">
            <ul className="contact-links contact-reveal">
              {contactLinks.map((link) =>
                link.href ? (
                  <li key={link.value}>
                    <a
                      className="contact-link"
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        link.href.startsWith("http")
                          ? "noreferrer noopener"
                          : undefined
                      }
                    >
                      <span className="label">{link.label}</span>
                      <span className="value">{link.value}</span>
                      <span className="arrow">→</span>
                    </a>
                  </li>
                ) : (
                  <li key={link.value}>
                    <span className="contact-link is-static">
                      <span className="label">{link.label}</span>
                      <span className="value">{link.value}</span>
                    </span>
                  </li>
                )
              )}
            </ul>
            <ContactGlobe />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p className="footer-copy">© {year} Marco Ng. <span>All rights reserved.</span></p>
        <Link
          className="footer-funbtn"
          to="/fun"
          onClick={(e) => {
            // Let modifier-clicks (open in new tab, etc.) behave natively.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            portalTo("/fun", e.currentTarget);
          }}
        >
          <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 6.5h9c2 0 3.1 1.5 3.6 3.6l1 5.2c.5 2.7-1.6 3.7-3.3 2.1L15 15h-6l-2.8 2.4c-1.7 1.6-3.8.6-3.3-2.1l1-5.2c.5-2.1 1.6-3.6 3.6-3.6Z" />
            <path d="M6.3 10.8h3.4M8 9.1v3.4m6.7-1.1h.1m2-1.8h.1" />
          </svg>
          For Fun
        </Link>
      </footer>
    </>
  );
};

export default Contact;
