import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { drugProducts, drugAreaColors } from "../constants";

gsap.registerPlugin(ScrollTrigger);

const ROWS = 3;
const colorFor = (area) => drugAreaColors[area] ?? "#839cb5";

const DrugProducts = () => {
  const sectionRef = useRef(null);

  // The legend doubles as a filter. Hover previews an area; clicking pins it so
  // it works on touch too, where there is no hover to preview with. Pinning also
  // pauses the marquee — without that the pills you just highlighted scroll
  // straight out from under you.
  const [pinnedArea, setPinnedArea] = useState(null);
  const [hoverArea, setHoverArea] = useState(null);
  const focusArea = hoverArea ?? pinnedArea;

  // spread the products across the marquee rows
  const rows = Array.from({ length: ROWS }, (_, r) =>
    drugProducts.filter((_, i) => i % ROWS === r)
  );

  // only show legend entries that are actually used
  const usedAreas = [...new Set(drugProducts.map((d) => d.area))];

  // how many products per area — derived, so it can never disagree with the list
  const countFor = (area) => drugProducts.filter((d) => d.area === area).length;

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
    <section id="drugs" ref={sectionRef} className="drugs-section section-band is-alt">
      <div className="drugs-head">
        <p className="section-eyebrow">Product experience</p>
        <h2 className="section-title">Drug products I've helped bring to HCPs</h2>
        <p className="section-lead">
          A snapshot of the therapies I've developed promotional and educational
          content for, spanning multiple therapeutic areas.
        </p>

        <div className="drug-legend">
          {usedAreas.map((area) => (
            <button
              key={area}
              type="button"
              className={`drug-legend-btn${pinnedArea === area ? " is-pinned" : ""}`}
              aria-pressed={pinnedArea === area}
              onClick={() => setPinnedArea((a) => (a === area ? null : area))}
              onMouseEnter={() => setHoverArea(area)}
              onMouseLeave={() => setHoverArea(null)}
              onFocus={() => setHoverArea(area)}
              onBlur={() => setHoverArea(null)}
            >
              <span className="dot" style={{ background: colorFor(area) }} />
              {area}
              <span className="drug-legend-count">{countFor(area)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`drug-rows${focusArea ? " is-filtering" : ""}`}>
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
                  className={`drug-pill${
                    focusArea && drug.area !== focusArea ? " is-dimmed" : ""
                  }`}
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
