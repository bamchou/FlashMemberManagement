'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export const NAV_PROGRESS_EVENT = 'nav-progress-start'

/** 画面上部の進捗バー（NavigationProgress）を開始する */
export function startNavigationProgress() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NAV_PROGRESS_EVENT))
}

/**
 * ボタンから画面遷移するときに使う。上部の進捗バーを出しつつ、
 * 遷移完了までの間 isNavigating=true を返す（スピナー表示用）。
 */
export function useProgressNavigate() {
  const router = useRouter()
  const [isNavigating, startTransition] = useTransition()

  function navigate(href: string) {
    const url = new URL(href, window.location.href)
    if (url.pathname === window.location.pathname && url.search === window.location.search) return
    startNavigationProgress()
    startTransition(() => { router.push(href) })
  }

  return { navigate, isNavigating }
}
