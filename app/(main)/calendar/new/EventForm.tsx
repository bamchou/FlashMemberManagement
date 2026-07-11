'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createEvent } from '../actions'

const EVENT_TYPES = [
  { value: 'practice',   label: '練習' },
  { value: 'tournament', label: '大会' },
  { value: 'event',      label: 'イベント' },
  { value: 'social',     label: '親睦会' },
  { value: 'other',      label: 'その他' },
]

const ALL_TARGETS = [
  { value: 'all',    label: '全員' },
  { value: 'coach',  label: '指導者のみ' },
  { value: 'member', label: '保護者のみ' },
]

const MEMBER_TARGETS = [
  { value: 'all',    label: '全員' },
  { value: 'member', label: '保護者のみ' },
]

function toLocalDatetimeStr(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${day}T${h}:${min}`
}

function makeDefaults(dateStr?: string): { start: string; end: string } {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // 日付クリックからの遷移: その日の9:00〜11:00をデフォルトに
    return {
      start: `${dateStr}T09:00`,
      end:   `${dateStr}T11:00`,
    }
  }
  // 通常遷移: 現在時刻の次の1時間〜3時間
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(0)
  d.setHours(d.getHours() + 1)
  const start = toLocalDatetimeStr(d)
  d.setHours(d.getHours() + 2)
  return { start, end: toLocalDatetimeStr(d) }
}

export default function EventForm({ role, defaultDate }: { role: string; defaultDate?: string }) {
  const targets = role === 'admin' || role === 'coach' ? ALL_TARGETS : MEMBER_TARGETS
  const { start: initStart, end: initEnd } = makeDefaults(defaultDate)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('practice')
  const [target, setTarget] = useState('all')
  const [startAt, setStartAt] = useState(initStart)
  const [endAt, setEndAt] = useState(initEnd)
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('title', title)
    fd.set('event_type', eventType)
    fd.set('target', target)
    fd.set('start_at', startAt)
    fd.set('end_at', endAt)
    fd.set('description', description)
    startTransition(async () => {
      const result = await createEvent(undefined, fd)
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#EAE0A8] p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          lang="ja"
          placeholder="例）第10回市民大会"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
            種類 <span className="text-red-500">*</span>
          </label>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
          >
            {EVENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
            対象 <span className="text-red-500">*</span>
          </label>
          <select
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
          >
            {targets.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
            開始日時 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={e => setStartAt(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
            終了日時 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={endAt}
            onChange={e => setEndAt(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">メモ</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          lang="ja"
          placeholder="場所・持ち物など"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/calendar"
          className="flex-1 text-center py-2.5 border border-gray-300 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 bg-[#1A3666] text-white text-sm font-semibold rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
        >
          {isPending ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
