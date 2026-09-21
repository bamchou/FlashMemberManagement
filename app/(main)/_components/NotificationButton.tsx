'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const OPTOUT_KEY = 'push-optout' // 意図的にOFFにしたら立てるフラグ（端末ごと）

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) {
    view[i] = raw.charCodeAt(i)
  }
  return buffer
}

export default function NotificationButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [hoursBefore, setHoursBefore] = useState(1)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const hoursRef = useRef(1)
  useEffect(() => { hoursRef.current = hoursBefore }, [hoursBefore])

  // 購読を確立（必要なら許可を要求）。成功で true。
  const ensureSubscribed = useCallback(async (requestIfNeeded: boolean): Promise<boolean> => {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      let perm = Notification.permission
      if (perm === 'default' && requestIfNeeded) {
        perm = await Notification.requestPermission()
        setPermission(perm)
      }
      if (perm !== 'granted') return false
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
    }
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), hoursBefore: hoursRef.current }),
    })
    if (res.ok) {
      setSubscribed(true)
      return true
    }
    return false
  }, [])

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    setPermission(Notification.permission)

    let cancelled = false
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          if (cancelled) return
          setSubscribed(true)
          // 保存済みの通知タイミングを読み込む
          try {
            const res = await fetch('/api/push/subscribe')
            const data = await res.json()
            const match = (data.subscriptions ?? []).find(
              (s: { endpoint: string; hours_before: number }) => s.endpoint === sub.endpoint
            )
            if (match && !cancelled) setHoursBefore(match.hours_before)
          } catch {}
          return
        }

        // 未購読：意図的OFFでなく、ブロックもされていなければ自動で有効化を試みる（デフォルトON）
        const optedOut = localStorage.getItem(OPTOUT_KEY) === '1'
        if (optedOut || Notification.permission === 'denied') return

        const ok = await ensureSubscribed(true)
        // iOS等、許可要求にユーザー操作が必要な場合は初回タップで再試行
        if (!ok && !cancelled && Notification.permission === 'default') {
          const onFirstGesture = () => {
            document.removeEventListener('click', onFirstGesture)
            if (localStorage.getItem(OPTOUT_KEY) === '1') return
            ensureSubscribed(true).catch(() => {})
          }
          document.addEventListener('click', onFirstGesture, { once: true })
        }
      } catch {}
    })()

    return () => { cancelled = true }
  }, [ensureSubscribed])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleEnable() {
    setLoading(true)
    setMessage(null)
    try {
      localStorage.removeItem(OPTOUT_KEY)
      const ok = await ensureSubscribed(true)
      setMessage(ok ? '通知をONにしました' : (Notification.permission === 'denied'
        ? 'ブラウザ側でブロックされています'
        : '通知を有効にできませんでした'))
      setPermission(Notification.permission)
    } catch {
      setMessage('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setLoading(true)
    setMessage(null)
    try {
      // 意図的OFF：自動再有効化しないようフラグを立てる
      localStorage.setItem(OPTOUT_KEY, '1')
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
      setMessage('通知をOFFにしました')
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
          <p className="text-sm font-bold text-[#1A3666] mb-1">プッシュ通知</p>
          <p className="text-[11px] text-gray-400 mb-3">予定・お知らせの通知は既定でONです</p>

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">通知タイミング（予定の何時間前）</p>
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
                通知はONです
              </p>
              <button
                type="button"
                onClick={handleDisable}
                disabled={loading}
                className="w-full py-2 text-sm font-semibold text-red-500 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {loading ? '処理中...' : '通知をOFFにする'}
              </button>
            </>
          ) : permission === 'denied' ? (
            <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              ブラウザ側で通知がブロックされています。端末やブラウザの設定でこのサイトの通知を「許可」に変更してください。
            </p>
          ) : (
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="w-full py-2 text-sm font-semibold bg-[#1A3666] text-white rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
            >
              {loading ? '処理中...' : '通知をONにする'}
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
