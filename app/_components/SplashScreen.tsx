'use client'

import { useState, useEffect } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // PWAとしてインストールされている場合のみ表示
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!standalone) return

    // セッション中1回だけ表示
    if (sessionStorage.getItem('splash-shown')) return

    sessionStorage.setItem('splash-shown', '1')
    setVisible(true)

    const fadeTimer = setTimeout(() => setFading(true), 2000)
    const hideTimer = setTimeout(() => setVisible(false), 2700)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        transition: 'opacity 0.7s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* 背景色 */}
      <div className="absolute inset-0 bg-black" />
      {/* Splash画像を全体表示 */}
      <img
        src="/splash.png"
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
      />
    </div>
  )
}
