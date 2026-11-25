import { useEffect, useRef, useState } from 'react'
import { workProjects } from '../constants'

export default function WorkCoverFlow() {
  const host = useRef(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const node = host.current
    const controller = new AbortController()
    async function start() {
      try {
        const { mountCoverFlow } = await import('./work-coverflow/mount.js')
        if (!controller.signal.aborted) mountCoverFlow(node, workProjects, controller.signal)
      } catch {
        if (!controller.signal.aborted) setUnavailable(true)
      }
    }
    // The large model is not part of the initial hero load. Opening /#work
    // directly takes the same path as scrolling here from the homepage.
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        start()
      }
    }, { rootMargin: '240px 0px' })
    observer.observe(node)
    return () => {
      observer.disconnect()
      controller.abort()
    }
  }, [])

  return unavailable ? (
    <div className="work-summaries">
      {workProjects.map(project => (
        <details key={project.molecule}>
          <summary>{project.molecule} · {project.tag}</summary>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <p>{project.chips.join(' · ')}</p>
        </details>
      ))}
    </div>
  ) : <div className="work-coverflow" ref={host} />
}
