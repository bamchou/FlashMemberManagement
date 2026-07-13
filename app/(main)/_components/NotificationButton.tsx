'use client'

import { useState, useEffect, useRef } from 'react'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export default function NotificationButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [hoursBefore, setHoursBefore] = useState(1)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)

    navigator.serviceWorker.register('/sw.js').catch(() => {})

    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!sub) return
        setSubscribed(true)
        const res = await fetch('/api/push/subscribe')
        const data = await res.json()
        const match = (data.subscriptions ?? []).find(
          (s: { endpoint: string; hours_before: number }) => s.endpoint === sub.endpoint
        )
        if (match) setHoursBefore(match.hours_before)
      } catch {}
    })()
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSubscribe() {
    setLoading(true)
    setMessage(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setMessage('通知の許可が必要です')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), hoursBefore }),
      })
      if (res.ok) {
        setSubscribed(true)
        setMessage('通知を有効にしました')
      }
    } catch {
      setMessage('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsubscribe() {
    setLoading(true)
    setMessage(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
      setMessage('通知を無効にしました')
    } catch {
      setMessage('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleHoursChange(h: number) {
    setHoursBefore(h)
    if (!subscribed) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), hoursBefore: h }),
        })
      }
    } catch {}
  }

  if (!supported) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setMessage(null) }}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
          subscribed ? 'text-[#F5C800]' : 'text-white/50 hover:text-white'
        }`}
        title="通知設定"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-xl border border-[#EAE0A8] p-4 z-50">
          <p className="text-sm font-bold text-[#1A3666] mb-3">プッシュ通知</p>

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">通知タイミング</p>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHoursChange(h)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    hoursBefore === h
                      ? 'bg-[#1A3666] text-white border-[#1A3666]'
                      : 'text-gray-500 border-gray-300 hover:border-[#1A3666] hover:text-[#1A3666]'
                  }`}
                >
                  {h}時間前
                </button>
              ))}
            </div>
          </div>

          {subscribed ? (
            <>
              <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                通知が有効です
              </p>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={loading}
                className="w-full py-2 text-sm font-semibold text-red-500 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {loading ? '処理中...' : '通知を無効にする'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-2 text-sm font-semibold bg-[#1A3666] text-white rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
            >
              {loading ? '処理中...' : '通知を有効にする'}
            </button>
          )}

          {message && (
            <p className="text-xs text-gray-500 text-center mt-2">{message}</p>
          )}
        </div>
      )}
    </div>
  )
}
