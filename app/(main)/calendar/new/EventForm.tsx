'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createEvent } from '../actions'
import type { AccompanimentFeeSetting } from '@/lib/types'

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

function toLocalDateStr(d: Date): string {
  return toLocalDatetimeStr(d).slice(0, 10)
}

function makeDefaults(dateStr?: string): { start: string; end: string; date: string } {
  const base = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : toLocalDatetimeStr(new Date()).slice(0, 10)
  return { start: `${base}T19:30`, end: `${base}T21:30`, date: base }
}

type FeeMode = 'none' | 'amount'

export default function EventForm({
  role,
  defaultDate,
  accompanimentFees,
}: {
  role: string
  defaultDate?: string
  accompanimentFees: AccompanimentFeeSetting[]
}) {
  const targets = role === 'admin' || role === 'coach' ? ALL_TARGETS : MEMBER_TARGETS
  const { start: initStart, end: initEnd, date: initDate } = makeDefaults(defaultDate)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('practice')
  const [target, setTarget] = useState('all')
  const [isAllDay, setIsAllDay] = useState(false)
  const [startAt, setStartAt] = useState(initStart)
  const [endAt, setEndAt] = useState(initEnd)
  const [startDate, setStartDate] = useState(initDate)
  const [endDate, setEndDate] = useState(initDate)
  const [description, setDescription] = useState('')

  // 大会固有
  const [venue, setVenue] = useState('')
  const [tournamentScope, setTournamentScope] = useState<'singles' | 'both'>('both')
  const [singlesMode, setSinglesMode] = useState<FeeMode>('amount')
  const [singlesAmount, setSinglesAmount] = useState('')
  const [doublesMode, setDoublesMode] = useState<FeeMode>('amount')
  const [doublesAmount, setDoublesAmount] = useState('')
  const [accompType, setAccompType] = useState('local')

  function toggleAllDay(val: boolean) {
    if (val) {
      setStartDate(startAt.slice(0, 10))
      setEndDate(endAt.slice(0, 10))
    } else {
      setStartAt(`${startDate}T19:30`)
      setEndAt(`${endDate}T21:30`)
    }
    setIsAllDay(val)
  }

  function handleSubmit() {
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    if (isAllDay && endDate < startDate) { setError('終了日は開始日以降にしてください'); return }
    if (eventType === 'tournament') {
      if (singlesMode === 'amount' && (!singlesAmount || parseInt(singlesAmount, 10) <= 0)) {
        setError('シングルス参加費の金額を入力してください'); return
      }
      if (tournamentScope === 'both' && doublesMode === 'amount' && (!doublesAmount || parseInt(doublesAmount, 10) <= 0)) {
        setError('ダブルス参加費の金額を入力してください'); return
      }
    }
    setError(null)

    const fd = new FormData()
    fd.set('title', title)
    fd.set('event_type', eventType)
    fd.set('target', target)
    fd.set('is_all_day', String(isAllDay))
    fd.set('start_at', isAllDay ? startDate : startAt)
    fd.set('end_at', isAllDay ? endDate : endAt)
    fd.set('description', description)

    if (eventType === 'tournament') {
      fd.set('venue', venue)
      fd.set('singles_fee_mode', singlesMode)
      if (singlesMode === 'amount') fd.set('singles_fee', singlesAmount)
      // シングルスのみの場合はダブルスを不要扱い
      if (tournamentScope === 'both') {
        fd.set('doubles_fee_mode', doublesMode)
        if (doublesMode === 'amount') fd.set('doubles_fee', doublesAmount)
      } else {
        fd.set('doubles_fee_mode', 'none')
      }
      fd.set('accompaniment_type', accompType)
    }

    startTransition(async () => {
      const result = await createEvent(fd)
      if (result && 'error' in result) setError(result.error)
    })
  }

  const isTournament = eventType === 'tournament'

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-6 space-y-5">
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

      {/* 終日トグル */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => toggleAllDay(!isAllDay)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isAllDay ? 'bg-[#1A3666]' : 'bg-gray-200'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            isAllDay ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        <span className="text-sm font-semibold text-[#1A3666]">終日</span>
      </div>

      {isAllDay ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
              開始日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
              終了日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
            />
          </div>
        </div>
      ) : (
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
            />
          </div>
        </div>
      )}

      {/* 大会参加費 */}
      {isTournament && (
        <div className="space-y-4 bg-[#F5F8FF] border border-[#D0DCF5] rounded-xl p-4">
          <p className="text-xs font-bold text-[#1A3666]">大会情報</p>

          {/* 会場 */}
          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">会場</label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              lang="ja"
              placeholder="例）○○市総合体育館"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            />
          </div>

          {/* 大会種別 */}
          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-2">大会種別</label>
            <div className="flex gap-2">
              {([
                { value: 'singles', label: 'シングルスのみ' },
                { value: 'both',    label: 'シングルス＋ダブルス' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTournamentScope(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                    tournamentScope === opt.value
                      ? 'bg-[#1A3666] border-[#1A3666] text-white'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <FeeField
            label="シングルス参加費"
            mode={singlesMode}
            amount={singlesAmount}
            onModeChange={setSinglesMode}
            onAmountChange={setSinglesAmount}
          />
          {tournamentScope === 'both' && (
            <FeeField
              label="ダブルス参加費"
              mode={doublesMode}
              amount={doublesAmount}
              onModeChange={setDoublesMode}
              onAmountChange={setDoublesAmount}
            />
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-2">帯同費</label>
            <div className="flex flex-wrap gap-2">
              {accompanimentFees.map(f => (
                <button
                  key={f.area_type}
                  type="button"
                  onClick={() => setAccompType(f.area_type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                    accompType === f.area_type ? 'bg-[#1A3666] border-[#1A3666] text-white' : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  {f.label}（{f.amount_per_person.toLocaleString()}円/人）
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAccompType('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                  accompType === '' ? 'bg-[#1A3666] border-[#1A3666] text-white' : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                なし
              </button>
            </div>
          </div>
        </div>
      )}

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
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 py-2.5 bg-[#1A3666] text-white text-sm font-semibold rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
        >
          {isPending ? '登録中...' : '登録する'}
        </button>
      </div>
    </div>
  )
}

function FeeField({
  label,
  mode,
  amount,
  onModeChange,
  onAmountChange,
}: {
  label: string
  mode: FeeMode
  amount: string
  onModeChange: (m: FeeMode) => void
  onAmountChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1A3666] mb-2">{label}</label>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onModeChange('none')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
            mode === 'none' ? 'bg-[#1A3666] border-[#1A3666] text-white' : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          不要
        </button>
        <button
          type="button"
          onClick={() => onModeChange('amount')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
            mode === 'amount' ? 'bg-[#1A3666] border-[#1A3666] text-white' : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          金額を入力
        </button>
        {mode === 'amount' && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => onAmountChange(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-1.5 pr-7 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">円</span>
          </div>
        )}
      </div>
    </div>
  )
}
