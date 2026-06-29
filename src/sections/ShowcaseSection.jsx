import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from "@gsap/react";

import { workProjects } from "../constants";

gsap.registerPlugin(ScrollTrigger);

const ShowcaseSection = () => {
  const sectionRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      ".work-head > *",
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
      ".work-card",
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: { trigger: ".work-grid", start: "top 80%" },
      }
    );
  }, []);

  return (
    <section id="work" ref={sectionRef} className="work-section">
      <div className="work-head">
        <p className="work-eyebrow">Selected work</p>
        <h2>Turning clinical data into content HCPs act on</h2>
        <p className="work-note">
          Client deliverables are confidential and shown here as summaries.
          Samples available on request under NDA.
        </p>
      </div>

      <div className="work-grid">
        {workProjects.map((project) => (
          <article
            key={project.title}
            className="work-card"
            style={{ "--accent": project.accent, "--icon": `url(${project.icon})` }}
          >
            <span className="work-watermark" aria-hidden="true" />

            <div className="work-card-body">
              <div className="work-icon">
                <img src={project.icon} alt="" />
              </div>

              <p className="work-tag">
                <span className="work-dot" />
                {project.tag}
              </p>

              <h3>{project.title}</h3>
              <p className="work-molecule">{project.molecule}</p>
              <p className="work-desc">{project.description}</p>

              <div className="work-chips">
                {project.chips.map((chip) => (
                  <span key={chip} className="work-chip">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ShowcaseSection
