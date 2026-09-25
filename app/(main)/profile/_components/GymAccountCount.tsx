'use client'

import { useState, useTransition } from 'react'
import { updateMyGymAccountCount } from '../actions'
import Spinner from '@/app/(main)/_components/Spinner'

const MAX = 10

export default function GymAccountCount({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function change(next: number) {
    setCount(Math.min(MAX, Math.max(0, next)))
    setError(null)
    setMessage(null)
  }

  function save() {
    startTransition(async () => {
      const res = await updateMyGymAccountCount(count)
      if (res?.error) { setError(res.error); return }
      setSaved(count)
      setMessage('保存しました')
    })
  }

  const stepCls = 'w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-lg font-bold text-[#1A3666] hover:bg-gray-50 disabled:opacity-30'

  return (
    <div className="border-t border-[#EAE0A8] pt-4">
      <p className="text-sm font-bold text-[#1A3666]">体育館予約アカウント</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        体育館の予約に使えるアカウントをいくつ持っているか登録してください。持っている数まで、同じ日に複数の予約担当を割り当てられることがあります。
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => change(count - 1)} disabled={count <= 0 || isPending} className={stepCls} aria-label="1つ減らす">−</button>
        <span className="min-w-[4.5rem] text-center text-lg font-bold text-[#1A3666]">
          {count}<span className="text-sm font-semibold ml-0.5">アカウント</span>
        </span>
        <button type="button" onClick={() => change(count + 1)} disabled={count >= MAX || isPending} className={stepCls} aria-label="1つ増やす">＋</button>
        <button
          type="button"
          onClick={save}
          disabled={isPending || count === saved}
          className="ml-2 inline-flex items-center gap-1.5 bg-[#1A3666] text-white text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-[#2A52A0] transition-colors disabled:opacity-40"
        >
          {isPending && <Spinner className="w-4 h-4" />}
          {isPending ? '保存中...' : '保存する'}
        </button>
        {message && count === saved && <span className="text-sm text-green-700">{message}</span>}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
