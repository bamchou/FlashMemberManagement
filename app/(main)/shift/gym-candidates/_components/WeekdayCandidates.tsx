'use client'

import { useState, useTransition } from 'react'
import { saveWeekdayCandidates, type CandidateInput } from '../actions'
import Spinner from '@/app/(main)/_components/Spinner'

const DOW = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜']

const toRows = (initial: CandidateInput[]): CandidateInput[] =>
  [1, 2, 3, 4].map(p => initial.find(r => r.priority === p) ?? { priority: p, gym_name: '', courts: '', start_time: '', end_time: '' })

export default function WeekdayCandidates({
  weekday,
  initial,
}: {
  weekday: number
  initial: CandidateInput[]
}) {
  const [rows, setRows] = useState<CandidateInput[]>(() => toRows(initial))
  const [saved, setSaved] = useState<CandidateInput[]>(() => toRows(initial))
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty = JSON.stringify(rows) !== JSON.stringify(saved)
  const isEmpty = saved.every(r => !r.gym_name.trim())
  const color = weekday === 0 ? 'text-red-500' : weekday === 6 ? 'text-blue-500' : 'text-[#1A3666]'

  function update(i: number, patch: Partial<CandidateInput>) {
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
    setMessage(null)
    setError(null)
  }

  function save() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const res = await saveWeekdayCandidates(weekday, rows)
      if (res?.error) { setError(res.error); return }
      // 体育館名が空の行は保存時に削除されるので、入力欄も空に揃える
      const normalized = rows.map(r => r.gym_name.trim() ? r : { priority: r.priority, gym_name: '', courts: '', start_time: '', end_time: '' })
      setRows(normalized)
      setSaved(normalized)
      setMessage('保存しました')
    })
  }

  const inputCls = 'px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white'

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
      <div className="px-4 py-1.5 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between">
        <h2 className={`text-sm font-bold ${color}`}>{DOW[weekday]}</h2>
        {isEmpty && <span className="text-xs text-gray-400">なし</span>}
      </div>

      <div className="px-3 py-2.5 space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.priority} className="flex items-center gap-x-2 gap-y-1 flex-wrap">
            <span className="text-xs font-bold text-gray-500 w-7 shrink-0">第{r.priority}</span>
            <input
              aria-label={`${DOW[weekday]} 第${r.priority}候補の体育館名`}
              type="text"
              lang="ja"
              placeholder="体育館名"
              value={r.gym_name}
              onChange={e => update(i, { gym_name: e.target.value })}
              className={`${inputCls} flex-1 min-w-[9rem]`}
            />
            <div className="flex items-center gap-1 shrink-0 ml-9 sm:ml-0">
              <input
                aria-label={`${DOW[weekday]} 第${r.priority}候補の面数`}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={r.courts}
                onChange={e => update(i, { courts: e.target.value.replace(/[^0-9０-９]/g, '').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)) })}
                className={`${inputCls} w-10 text-center`}
              />
              <span className="text-sm text-gray-600 mr-2">面</span>
              <input
                aria-label={`${DOW[weekday]} 第${r.priority}候補の開始時刻`}
                type="time"
                value={r.start_time}
                onChange={e => update(i, { start_time: e.target.value })}
                className={`${inputCls} w-[6.5rem]`}
              />
              <span className="text-gray-400 text-sm">～</span>
              <input
                aria-label={`${DOW[weekday]} 第${r.priority}候補の終了時刻`}
                type="time"
                value={r.end_time}
                onChange={e => update(i, { end_time: e.target.value })}
                className={`${inputCls} w-[6.5rem]`}
              />
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-0.5">
          {message && !dirty && <span className="text-sm text-green-700">{message}</span>}
          {dirty && <span className="text-xs text-orange-600">未保存の変更があります</span>}
          <button
            type="button"
            onClick={save}
            disabled={isPending || !dirty}
            className="inline-flex items-center gap-1.5 bg-[#1A3666] text-white text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-[#2A52A0] transition-colors disabled:opacity-40"
          >
            {isPending && <Spinner className="w-4 h-4" />}
            {isPending ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}
