import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'


const preference = query => ({
  subscribe: callback => {
    const media = window.matchMedia(query)
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
  },
  snapshot: () => window.matchMedia(query).matches,
})
const reducedMotion = preference('(prefers-reduced-motion: reduce)')
const smallViewport = preference('(max-width: 767px)')
const subscribeVisibility = callback => {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}
const subscribeConnection = callback => {
  const connection = navigator.connection
  connection?.addEventListener('change', callback)
  return () => connection?.removeEventListener('change', callback)
}
const isVisible = () => !document.hidden
const isSavingData = () => Boolean(navigator.connection?.saveData)
const yes = () => true
const no = () => false

export function useHeroMotion(stageRef) {
  const reduced = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.snapshot, yes)
  const mobile = useSyncExternalStore(smallViewport.subscribe, smallViewport.snapshot, no)
  const saveData = useSyncExternalStore(subscribeConnection, isSavingData, yes)
  const visible = useSyncExternalStore(subscribeVisibility, isVisible, no)
  const [inView, setInView] = useState(false)
  const [entered, setEntered] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (entry.isIntersecting) setEntered(true)
    }, { threshold: 0.05 })
    if (stageRef.current) observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [stageRef])

  const allowed = !reduced && !saveData
  const reportBlocked = useCallback(() => setBlocked(true), [])
  const toggle = () => {
    if (blocked) {
      setBlocked(false)
      setUserPaused(false)
    } else setUserPaused(paused => !paused)
  }

  return {
    mobile, reduced, saveData, allowed, blocked, userPaused, toggle, reportBlocked,
    loadVideo: allowed && entered,
    running: allowed && inView && visible && !userPaused && !blocked,
  }
}
