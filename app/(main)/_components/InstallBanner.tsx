'use client'

import { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return

    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    const android = /Android/.test(navigator.userAgent)

    if (ios) {
      setIsIOS(true)
      setShow(true)
    } else if (android) {
      // Android shows native prompt automatically — no banner needed
    }
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-[#1A3666] text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">🏸</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">アプリとして追加できます</p>
          {isIOS ? (
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              Safari の下部にある
              <span className="inline-block mx-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-bold">共有</span>
              ボタンをタップし、「ホーム画面に追加」を選択してください。
            </p>
          ) : (
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              ブラウザのメニューから「ホーム画面に追加」を選択してください。
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-white/60 hover:text-white text-lg leading-none mt-0.5"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
