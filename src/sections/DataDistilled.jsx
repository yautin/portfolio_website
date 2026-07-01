import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { dataDistillExamples, drugAreaColors } from "../constants";

gsap.registerPlugin(ScrollTrigger);

const colorFor = (area) => drugAreaColors[area] ?? "#839cb5";

// symbol footnotes (e.g. the population * and TPC † notes), across all examples
const footNotes = dataDistillExamples.flatMap((ex) => ex.footnotes ?? []);

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const DataDistilled = () => {
  const sectionRef = useRef(null);

  useGSAP(() => {
    // jump straight to the resolved state when motion is reduced
    if (prefersReducedMotion) {
      gsap.utils.toArray(".distill-bar-fill").forEach((el) => {
        gsap.set(el, { scaleX: parseFloat(el.dataset.fraction) });
      });
      return;
    }

    gsap.fromTo(
      ".distill-head > *",
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
      }
    );

    gsap.fromTo(
      ".distill-row",
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: { trigger: ".distill-flow", start: "top 80%" },
      }
    );

    // count each hero figure up from zero when the section scrolls into view
    gsap.utils.toArray(".distill-num").forEach((el) => {
      const value = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals, 10);
      gsap.fromTo(
        el,
        { innerText: 0 },
        {
          innerText: value,
          duration: 2,
          ease: "power2.out",
          snap: { innerText: decimals === 0 ? 1 : 0.1 },
          scrollTrigger: { trigger: ".distill-flow", start: "top 75%", once: true },
          onComplete: () => {
            el.innerText = value.toFixed(decimals);
          },
        }
      );
    });

    // grow each comparison bar to its share of the larger arm (triggered off the
    // stable flow container, not the transformed rows, so both rows fire reliably)
    gsap.fromTo(
      ".distill-bar-fill",
      { scaleX: 0 },
      {
        scaleX: (_i, el) => parseFloat(el.dataset.fraction),
        duration: 1.1,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".distill-flow", start: "top 70%", once: true },
      }
    );
  }, []);

  return (
    <section id="distill" ref={sectionRef} className="distill-section">
      <div className="distill-head">
        <p className="distill-eyebrow">Data distilled</p>
        <h2>Trial data, made to land with clinicians</h2>
        <p className="distill-note">
          Real trial readouts condensed into the single takeaway an HCP needs.
        </p>
      </div>

      <div className="distill-flow">
        {dataDistillExamples.map((ex, i) => (
          <div
            key={i}
            className="distill-row"
            style={{ "--accent": colorFor(ex.area) }}
          >
            <div className="distill-raw">
              <span className="distill-trial">
                {ex.trial}
                <sup>{i + 1}</sup>
              </span>
              <span className="distill-population">
                {ex.population}
                {ex.footnotes
                  ?.filter((f) => f.target === "population")
                  .map((f) => (
                    <sup key={f.symbol}>{f.symbol}</sup>
                  ))}
              </span>
              <span className="distill-source">{ex.source}</span>
            </div>

            <div className="distill-connector" aria-hidden="true">
              <svg className="distill-arrow" viewBox="0 0 128 24" fill="none">
                <line className="distill-arrow-rail" x1="4" y1="12" x2="108" y2="12" />
                <path className="distill-arrow-head" d="M103 5 L116 12 L103 19" />
              </svg>
            </div>

            <div
              className="distill-result"
              aria-label={`${ex.trial}: ${ex.metricValue}${ex.suffix} ${ex.metricLabel} — ${ex.statement}. ${ex.source}`}
            >
              <span className="distill-metric" aria-hidden="true">
                <span
                  className="distill-num"
                  data-value={ex.metricValue}
                  data-decimals={ex.decimals}
                >
                  {prefersReducedMotion ? ex.metricValue.toFixed(ex.decimals) : "0"}
                </span>
                {ex.suffix}
              </span>
              <span className="distill-metric-label" aria-hidden="true">
                {ex.metricLabel}
              </span>
              <span className="distill-statement" aria-hidden="true">
                <svg
                  className={`distill-arrow-glyph ${ex.direction === "up" ? "is-up" : ""}`}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
                <span>
                  {ex.statement}
                  {ex.footnotes
                    ?.filter((f) => f.target === "statement")
                    .map((f) => (
                      <sup key={f.symbol}>{f.symbol}</sup>
                    ))}
                </span>
              </span>

              <div className="distill-bars" aria-hidden="true">
                {ex.arms.map((arm, j) => (
                  <div
                    key={j}
                    className={`distill-bar ${j === 0 ? "is-drug" : ""}`}
                  >
                    <span className="distill-bar-label">{arm.label}</span>
                    <span className="distill-bar-track">
                      <span
                        className="distill-bar-fill"
                        data-fraction={arm.fraction}
                      />
                    </span>
                    <span className="distill-bar-value">
                      {arm.value}
                      {arm.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="distill-refs">
        {footNotes.map((f, i) => (
          <p className="distill-footnote" key={i}>
            <span className="distill-ref-num">{f.symbol}</span>
            {f.text}
          </p>
        ))}

        <ol className="distill-ref-list">
          {dataDistillExamples.map((ex, i) => (
            <li key={i}>
              <span className="distill-ref-num">{i + 1}</span>
              {ex.citation}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default DataDistilled;
