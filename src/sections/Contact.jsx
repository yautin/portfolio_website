import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { contactEmail, contactLinks, web3formsKey } from "../constants";

gsap.registerPlugin(ScrollTrigger);

const year = new Date().getFullYear();

const Contact = () => {
  const sectionRef = useRef(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();

    // Until a Web3Forms key is configured, fall back to a pre-filled mail draft.
    if (!web3formsKey || web3formsKey === "YOUR_WEB3FORMS_ACCESS_KEY") {
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
      <section id="contact" ref={sectionRef} className="contact-section">
        <div className="contact-grid">
          <div className="contact-intro">
            <p className="contact-eyebrow contact-reveal">Contact</p>
            <h2 className="contact-title contact-reveal">Let&rsquo;s work together</h2>
            <p className="contact-note contact-reveal">
              I help medical and commercial teams turn complex clinical data into
              accurate, compelling content for healthcare professionals — from
              detail aids to symposium highlights. Available for freelance and contract
              work.
            </p>

            <p className="contact-status contact-reveal">
              <span className="dot" />
              Currently open to new projects
            </p>

            <ul className="contact-links contact-reveal">
              {contactLinks.map((link) =>
                link.href ? (
                  <li key={link.label}>
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
                  <li key={link.label}>
                    <span className="contact-link is-static">
                      <span className="label">{link.label}</span>
                      <span className="value">{link.value}</span>
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          <form className="contact-form contact-reveal" onSubmit={onSubmit}>
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
                placeholder="Tell me about the project…"
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
        </div>
      </section>

      <footer className="site-footer">
        <div className="inner">
          {/* <div className="footer-brand">
            <p className="footer-name">Marco Ng</p>
            <p className="footer-tag">Medical writer · Hong Kong</p>
          </div> */}

          {/* <nav className="footer-nav">
            {navLinks.map(({ link, name }) => (
              <a key={name} href={link}>
                {name}
              </a>
            ))}
            <a href="#contact">Contact</a>
          </nav> */}

          <p className="footer-copy">© {year} Marco Ng. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
};

export default Contact;
