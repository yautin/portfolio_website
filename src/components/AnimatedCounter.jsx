import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { counterItems } from "../constants";

gsap.registerPlugin(ScrollTrigger);

const AnimatedCounter = () => {
  const counterRef = useRef(null);
  const countersRef = useRef([]);

  useGSAP(() => {
    // The markup already carries the final figure, so a visitor who arrives
    // mid-section, prefers reduced motion, or scrolls past before ScrollTrigger
    // fires always reads a true number. The count-up is decoration on top.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    countersRef.current.forEach((counter, index) => {
      const numberElement = counter.querySelector(".counter-number");
      const item = counterItems[index];
      // 1.5 needs one decimal; 9 and 70 need none. The old snap was hard-coded
      // to whole numbers, so "1.5+" counted through "1" and had to be corrected
      // by an onComplete handler.
      const decimals = (String(item.value).split(".")[1] || "").length;
      const step = decimals ? 10 ** -decimals : 1;
      const render = (v) => `${v.toFixed(decimals)}${item.suffix}`;

      gsap.fromTo(
        numberElement,
        { innerText: 0 },
        {
          innerText: item.value,
          duration: 2.5,
          ease: "power2.out",
          snap: { innerText: step },
          // Without this, fromTo stamps the `from` value on mount and the card
          // reads 0 until the trigger fires — which is the bug this replaced.
          immediateRender: false,
          scrollTrigger: { trigger: "#counter", start: "top center" },
          // innerText tweening writes raw numbers, so re-render every frame to
          // keep the suffix attached and the decimals correct throughout.
          onUpdate: function () {
            numberElement.textContent = render(
              parseFloat(this.targets()[0].innerText) || 0
            );
          },
          onComplete: () => {
            numberElement.textContent = render(item.value);
          },
        }
      );
    }, counterRef);
  }, []);

  return (
    <div id="counter" ref={counterRef} className="padding-x-lg xl:mt-0 mt-32">
      <div className="mx-auto grid-3-cols">
        {counterItems.map((item, index) => (
          <div
            key={index}
            ref={(el) => el && (countersRef.current[index] = el)}
            className="counter-card"
          >
            <div className="counter-number">{item.value}{item.suffix}</div>
            <div className="text-white-50 text-lg">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnimatedCounter;