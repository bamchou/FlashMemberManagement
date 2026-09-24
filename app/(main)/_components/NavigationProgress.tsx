'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { NAV_PROGRESS_EVENT } from './useProgressNavigate'

/**
 * 画面遷移中に画面上部へ進捗バーを表示する（レンタルサーバーが遅いときの
 * 「止まって見える」対策）。リンククリックを検知して即座にバーを表示し、
 * URL（pathname / searchParams）が変わったら完了させる。
 * loading.tsx やプリフェッチの有無に関わらず、あらゆる遷移で反応する。
 */
export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibleRef = useRef(false)

  function finish() {
    if (!visibleRef.current) return
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (safetyRef.current) { clearTimeout(safetyRef.current); safetyRef.current = null }
    setProgress(100)
    hideRef.current = setTimeout(() => {
      visibleRef.current = false
      setVisible(false)
      setProgress(0)
    }, 250)
  }

  function start() {
    if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null }
    visibleRef.current = true
    setVisible(true)
    setProgress(p => (p > 0 && p < 90 ? p : 12))
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p
        const inc = p < 50 ? 9 : p < 75 ? 4 : 1.5
        return Math.min(90, p + inc)
      })
    }, 220)
    // 安全策: URLが変わらないまま終わった場合でも20秒で消す
    if (safetyRef.current) clearTimeout(safetyRef.current)
    safetyRef.current = setTimeout(finish, 20000)
  }

  // ボタン等からのプログラム遷移（startNavigationProgress）で開始
  useEffect(() => {
    const onStart = () => start()
    window.addEventListener(NAV_PROGRESS_EVENT, onStart)
    return () => window.removeEventListener(NAV_PROGRESS_EVENT, onStart)
  }, [])

  // リンククリックで開始
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      let url: URL
      try { url = new URL(href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      start()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // URLが変わったら完了
  useEffect(() => {
    finish()
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-[3px] pointer-events-none">
      <div
        className="h-full bg-[#F5C800] transition-[width] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 8px rgba(245,200,0,0.8), 0 0 4px rgba(245,200,0,0.6)',
        }}
      />
    </div>
  )
}
