'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const RESISTANCE = 0.4
const TRIGGER = 65
const MAX_PULL = 80

export default function PullToRefresh() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dist, setDist] = useState(0)
  const startY = useRef(0)
  const active = useRef(false)
  const distRef = useRef(0)
  const pendingRef = useRef(false)

  useEffect(() => { pendingRef.current = isPending }, [isPending])

  useEffect(() => {
    function onStart(e: TouchEvent) {
      if (window.scrollY === 0 && !pendingRef.current) {
        startY.current = e.touches[0].clientY
        active.current = true
      }
    }
    function onMove(e: TouchEvent) {
      if (!active.current) return
      const raw = e.touches[0].clientY - startY.current
      if (raw <= 0) {
        active.current = false
        distRef.current = 0
        setDist(0)
        return
      }
      const d = Math.min(raw * RESISTANCE, MAX_PULL)
      distRef.current = d
      setDist(d)
    }
    function onEnd() {
      if (!active.current) return
      active.current = false
      const d = distRef.current
      distRef.current = 0
      setDist(0)
      if (d >= TRIGGER) {
        startTransition(() => { router.refresh() })
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [router, startTransition])

  if (dist === 0 && !isPending) return null

  const progress = Math.min(dist / TRIGGER, 1)

  return (
    <div
      className="fixed left-0 right-0 z-50 flex justify-center items-center pointer-events-none"
      style={{ top: 56, height: isPending ? 48 : dist }}
    >
      {isPending ? (
        <div className="w-6 h-6 rounded-full border-2 border-[#1A3666] border-t-transparent animate-spin" />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-5 h-5 text-[#1A3666]"
          style={{ opacity: progress, transform: `rotate(${progress * 180}deg)` }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </div>
  )
}
