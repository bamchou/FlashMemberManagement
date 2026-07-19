'use client'

import { useState, useTransition, useEffect } from 'react'
import { generateCalendarToken, revokeCalendarToken } from '../sync-actions'

export default function CalendarSyncButton({ initialToken }: { initialToken: string | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [token, setToken] = useState<string | null>(initialToken)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  const [iosOpen, setIosOpen] = useState(false)
  const [androidOpen, setAndroidOpen] = useState(false)
  const [pcOpen, setPcOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const feedUrl = token && origin ? `${origin}/api/calendar/${token}.ics` : null

  function handleConnect() {
    setError(null)
    startTransition(async () => {
      const result = await generateCalendarToken()
      if (result.error) { setError(result.error); return }
      setToken(result.token ?? null)
    })
  }

  function handleRevoke() {
    if (!confirm('カレンダー連携を解除します。\nデバイスのカレンダーアプリからも購読を削除してください。\nよろしいですか？')) return
    setError(null)
    startTransition(async () => {
      const result = await revokeCalendarToken()
      if (result.error) { setError(result.error); return }
      setToken(null)
      setIsOpen(false)
    })
  }

  async function handleCopy() {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#1A3666] border border-[#1A3666]/30 bg-white px-3 py-1.5 rounded-lg hover:bg-[#F5F8FF] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        カレンダー連携
        {token && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        )}
      </button>

      {/* モーダル */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#1A3666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-base font-bold text-[#1A3666]">カレンダー連携</h2>
                {token && (
                  <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-2 py-0.5 rounded-full">連携中</span>
                )}
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              {!token ? (
                /* 未連携 */
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    連携するとBC FLASHの予定がスマートフォンのカレンダーアプリに自動で表示されます。
                    iPhoneのカレンダー・GoogleカレンダーなどのiCal対応アプリで利用できます。
                  </p>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={isPending}
                    className="w-full py-3 bg-[#1A3666] text-white font-semibold rounded-xl hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
                  >
                    {isPending ? '連携URLを生成中...' : '連携する'}
                  </button>
                </div>
              ) : (
                /* 連携済み */
                <div className="space-y-5">
                  {/* URL */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">あなた専用の連携URL</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono break-all">
                        {feedUrl}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="shrink-0 px-3 py-2 bg-[#1A3666] text-white text-xs font-semibold rounded-lg hover:bg-[#2A52A0] transition-colors"
                      >
                        {copied ? 'コピー済み✓' : 'コピー'}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">このURLは他の人に共有しないでください</p>
                  </div>

                  {/* iPhone手順 */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIosOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#1A3666] bg-gray-50"
                    >
                      <span className="flex items-center gap-2">🍎 iPhoneでの設定方法</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${iosOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {iosOpen && (
                      <ol className="px-4 py-3 space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
                        <li>上の「コピー」ボタンでURLをコピー</li>
                        <li>iPhoneの「設定」を開く</li>
                        <li>「カレンダー」→「アカウント」→「アカウントを追加」</li>
                        <li>「その他」→「照会するカレンダーを追加」</li>
                        <li>コピーしたURLをペーストして「次へ」</li>
                        <li>「保存」で完了</li>
                      </ol>
                    )}
                  </div>

                  {/* Android手順 */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAndroidOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#1A3666] bg-gray-50"
                    >
                      <span className="flex items-center gap-2">🤖 Androidでの設定方法</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${androidOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {androidOpen && (
                      <ol className="px-4 py-3 space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
                        <li>上の「コピー」ボタンでURLをコピー</li>
                        <li>Googleカレンダーアプリを開く</li>
                        <li>左上メニュー →「設定」→「カレンダーを追加」</li>
                        <li>「URLから」を選択</li>
                        <li>コピーしたURLをペーストして「カレンダーを追加」</li>
                      </ol>
                    )}
                  </div>

                  {/* PC（Googleカレンダー）手順 */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPcOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#1A3666] bg-gray-50"
                    >
                      <span className="flex items-center gap-2">🖥️ PC（Googleカレンダー）での設定方法</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${pcOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {pcOpen && (
                      <ol className="px-4 py-3 space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
                        <li>上の「コピー」ボタンでURLをコピー</li>
                        <li>ブラウザで <span className="font-mono text-xs bg-gray-100 px-1 rounded">calendar.google.com</span> を開く</li>
                        <li>左側「他のカレンダー」の横にある「＋」をクリック</li>
                        <li>「URLから追加」を選択</li>
                        <li>コピーしたURLをペーストして「カレンダーを追加」</li>
                      </ol>
                    )}
                  </div>

                  <p className="text-xs text-gray-400">
                    ※ 予定の更新はカレンダーアプリの自動更新タイミング（数時間〜1日）に依存します
                  </p>

                  {/* 連携解除 */}
                  <div className="border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={handleRevoke}
                      disabled={isPending}
                      className="w-full py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? '解除中...' : '連携を解除する'}
                    </button>
                    <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                      解除後はカレンダーアプリからも購読を削除してください
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
