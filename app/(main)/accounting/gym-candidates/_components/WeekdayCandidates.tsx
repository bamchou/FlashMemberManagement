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

  // 1つ上の候補と同じ時刻をコピー
  function copyTimeFromAbove(i: number) {
    if (i === 0) return
    update(i, { start_time: rows[i - 1].start_time, end_time: rows[i - 1].end_time })
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

  const inputCls = 'w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white'

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
      <div className="px-5 py-2.5 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between">
        <h2 className={`text-sm font-bold ${color}`}>{DOW[weekday]}</h2>
        {isEmpty && <span className="text-xs text-gray-400">なし（今は練習のない曜日）</span>}
      </div>

      <div className="p-4 space-y-3">
        {rows.map((r, i) => (
          <div key={r.priority} className="grid grid-cols-[3.5rem_1fr] gap-2 items-start">
            <span className="text-xs font-bold text-gray-500 pt-2">第{r.priority}候補</span>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2">
              <input
                aria-label={`${DOW[weekday]} 第${r.priority}候補の体育館名`}
                type="text"
                lang="ja"
                placeholder="体育館名（例: 託麻SC）"
                value={r.gym_name}
                onChange={e => update(i, { gym_name: e.target.value })}
                className={inputCls}
              />
              <input
                aria-label={`${DOW[weekday]} 第${r.priority}候補の面数`}
                type="text"
                lang="ja"
                placeholder="面数（例: 6面）"
                value={r.courts}
                onChange={e => update(i, { courts: e.target.value })}
                className={inputCls}
              />
              <div className="flex items-center gap-1.5 sm:col-span-2 flex-wrap">
                <input
                  aria-label={`${DOW[weekday]} 第${r.priority}候補の開始時刻`}
                  type="time"
                  value={r.start_time}
                  onChange={e => update(i, { start_time: e.target.value })}
                  className={`${inputCls} w-28`}
                />
                <span className="text-gray-400 text-sm">〜</span>
                <input
                  aria-label={`${DOW[weekday]} 第${r.priority}候補の終了時刻`}
                  type="time"
                  value={r.end_time}
                  onChange={e => update(i, { end_time: e.target.value })}
                  className={`${inputCls} w-28`}
                />
                {i > 0 && (rows[i - 1].start_time || rows[i - 1].end_time) && (
                  <button
                    type="button"
                    onClick={() => copyTimeFromAbove(i)}
                    className="text-[11px] text-[#1A3666] underline hover:no-underline ml-1"
                  >
                    上と同じ時刻
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          {message && !dirty && <span className="text-sm text-green-700">{message}</span>}
          {dirty && <span className="text-xs text-orange-600">未保存の変更があります</span>}
          <button
            type="button"
            onClick={save}
            disabled={isPending || !dirty}
            className="inline-flex items-center gap-1.5 bg-[#1A3666] text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-[#2A52A0] transition-colors disabled:opacity-40"
          >
            {isPending && <Spinner className="w-4 h-4" />}
            {isPending ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}
