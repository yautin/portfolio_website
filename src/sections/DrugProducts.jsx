import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { drugProducts, drugAreaColors } from "../constants";

gsap.registerPlugin(ScrollTrigger);

const ROWS = 3;
const colorFor = (area) => drugAreaColors[area] ?? "#839cb5";

const DrugProducts = () => {
  const sectionRef = useRef(null);

  // spread the products across the marquee rows
  const rows = Array.from({ length: ROWS }, (_, r) =>
    drugProducts.filter((_, i) => i % ROWS === r)
  );

  // only show legend entries that are actually used
  const usedAreas = [...new Set(drugProducts.map((d) => d.area))];

  useGSAP(() => {
    gsap.fromTo(
      ".drugs-head > *",
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
      ".drug-marquee",
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: { trigger: ".drug-rows", start: "top 85%" },
      }
    );
  }, []);

  return (
    <section id="drugs" ref={sectionRef} className="drugs-section">
      <div className="drugs-head">
        <p className="drugs-eyebrow">Product experience</p>
        <h2>Drug products I've helped bring to HCPs</h2>
        <p className="drugs-note">
          A snapshot of the therapies I've developed promotional and educational
          content for, spanning multiple therapeutic areas.
        </p>

        <div className="drug-legend">
          {usedAreas.map((area) => (
            <span key={area}>
              <span className="dot" style={{ background: colorFor(area) }} />
              {area}
            </span>
          ))}
        </div>
      </div>

      <div className="drug-rows">
        {rows.map((row, r) => (
          <div className="drug-marquee" key={r}>
            <div
              className={`drug-track ${r % 2 === 1 ? "reverse" : ""}`}
              style={{ "--duration": `${34 + r * 6}s` }}
            >
              {/* duplicated set so the loop is seamless */}
              {[...row, ...row].map((drug, i) => (
                <span
                  key={i}
                  className="drug-pill"
                  style={{ "--accent": colorFor(drug.area) }}
                >
                  <span className="drug-dot" />
                  {drug.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DrugProducts;
