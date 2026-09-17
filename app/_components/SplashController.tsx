'use client'

import { useEffect } from 'react'

/**
 * PWA Splash Screen のフェード制御。
 *
 * 表示自体は globals.css の `body::before`（@media standalone）が担う。
 * このコンポーネントは <html> に `splash-done` クラスを付け外しして
 * フェードアウトのタイミングだけを制御する。
 *
 * - 初回ロード: CSSが最初のペイント前からスプラッシュを不透明表示済み。
 *   ここでは一定時間後に `splash-done` を付けてフェードアウトさせるだけ。
 *   （表示はCSSが担うので「splash前にコンテンツが見える」flashは起きない）
 * - BFCache復帰: pageshow(persisted)で `splash-done` を外して再表示 → 再度タイマー。
 *   これがないと復帰時にアニメーション完了状態のまま＝スプラッシュがスキップされる。
 */
export default function SplashController() {
  useEffect(() => {
    const root = document.documentElement

    const isStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true

    let timer: ReturnType<typeof setTimeout> | undefined

    const runSplash = () => {
      if (!isStandalone()) return
      root.classList.remove('splash-done')
      clearTimeout(timer)
      timer = setTimeout(() => root.classList.add('splash-done'), 2500)
    }

    runSplash()

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) runSplash()
    }
    window.addEventListener('pageshow', onPageShow)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return null
}
