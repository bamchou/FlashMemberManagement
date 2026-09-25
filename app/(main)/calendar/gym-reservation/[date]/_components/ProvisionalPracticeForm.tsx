'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/app/(main)/_components/Spinner'
import { registerProvisionalPractice } from '../actions'

export type PracticeCandidate = {
  id: string
  label: string        // 例: 第1候補 託麻SC 6面
  start: string        // 'HH:MM' または ''
  end: string
}

/** 担当枠から練習を仮登録するフォーム */
export default function ProvisionalPracticeForm({
  date,
  slot,
  defaultCandidateId,
  candidates,
}: {
  date: string
  slot: number
  defaultCandidateId: string
  candidates: PracticeCandidate[]
}) {
  const router = useRouter()
  const initial = candidates.find(c => c.id === defaultCandidateId)
  const [open, setOpen] = useState(false)
  const [candidateId, setCandidateId] = useState(defaultCandidateId)
  const [start, setStart] = useState(initial?.start ?? '')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function selectCandidate(id: string) {
    setCandidateId(id)
    const c = candidates.find(x => x.id === id)
    // 候補に時刻があればそれを入れる
    if (c?.start) setStart(c.start)
    if (c?.end) setEnd(c.end)
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await registerProvisionalPractice(date, slot, candidateId, start, end)
      if (res?.error) { setError(res.error); return }
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-300 px-3 py-1.5 rounded-md hover:bg-orange-100"
      >
        ＋ 練習を仮登録
      </button>
    )
  }

  const inputCls = 'px-2 py-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent'

  return (
    <div className="mt-2 bg-white border border-orange-200 rounded-lg p-3 space-y-2">
      <p className="text-xs font-bold text-orange-700">予約できた体育館で練習を仮登録</p>
      <select
        aria-label="体育館"
        value={candidateId}
        onChange={e => selectCandidate(e.target.value)}
        className={`${inputCls} w-full`}
      >
        <option value="">体育館を選んでください</option>
        {candidates.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <div className="flex items-center gap-1.5">
        <input aria-label="開始時刻" type="time" value={start} onChange={e => setStart(e.target.value)} className={`${inputCls} w-[6.5rem]`} />
        <span className="text-gray-400 text-sm">～</span>
        <input aria-label="終了時刻" type="time" value={end} onChange={e => setEnd(e.target.value)} className={`${inputCls} w-[6.5rem]`} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          disabled={isPending}
          className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50"
        >
          やめる
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !candidateId || !start || !end}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-orange-500 px-4 py-1.5 rounded-md hover:bg-orange-600 disabled:opacity-40"
        >
          {isPending && <Spinner className="w-4 h-4" />}
          {isPending ? '登録中...' : '仮登録する'}
        </button>
      </div>
    </div>
  )
}
