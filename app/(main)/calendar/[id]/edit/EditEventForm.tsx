'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { updateEvent } from '../../actions'
import type { CalendarEvent, AccompanimentFeeSetting, Attachment } from '@/lib/types'
import AttachmentList from '@/app/(main)/_components/AttachmentList'

const PAYMENT_METHODS = [
  '口座振替', 'クレジットカード', 'コンビニ支払', 'ATM支払', 'ネットバンク', '電子マネー',
]

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

function isoToJSTDatetimeLocal(isoStr: string): string {
  const jstMs = new Date(isoStr).getTime() + 9 * 60 * 60 * 1000
  return new Date(jstMs).toISOString().slice(0, 16)
}

function isoToJSTDate(isoStr: string): string {
  const jstMs = new Date(isoStr).getTime() + 9 * 60 * 60 * 1000
  return new Date(jstMs).toISOString().slice(0, 10)
}

type FeeMode = 'none' | 'amount'

export default function EditEventForm({
  event,
  role,
  accompanimentFees,
  attachments,
}: {
  event: CalendarEvent
  role: string
  accompanimentFees: AccompanimentFeeSetting[]
  attachments: Attachment[]
}) {
  const targets = role === 'admin' || role === 'coach' ? ALL_TARGETS : MEMBER_TARGETS
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(event.title)
  const [eventType, setEventType] = useState(event.event_type as string)
  const [status, setStatus] = useState(event.status)
  const [target, setTarget] = useState(event.target as string)
  const [isAllDay, setIsAllDay] = useState(event.is_all_day)
  const [startAt, setStartAt] = useState(isoToJSTDatetimeLocal(event.start_at))
  const [endAt, setEndAt] = useState(isoToJSTDatetimeLocal(event.end_at))
  const [startDate, setStartDate] = useState(isoToJSTDate(event.start_at))
  const [endDate, setEndDate] = useState(isoToJSTDate(event.end_at))
  const [description, setDescription] = useState(event.description ?? '')
  const [paymentMethod, setPaymentMethod] = useState(event.payment_method ?? '')
  const [paymentAmount, setPaymentAmount] = useState(event.payment_amount?.toString() ?? '')

  const [venue, setVenue] = useState(event.venue ?? '')
  const [entryDeadline, setEntryDeadline] = useState(event.entry_deadline ?? '')
  const initSinglesMode: FeeMode = event.singles_fee != null ? 'amount' : 'none'
  const initDoublesMode: FeeMode = event.doubles_fee != null ? 'amount' : 'none'
  const [tournamentScope, setTournamentScope] = useState<'singles' | 'both'>(
    event.doubles_fee != null ? 'both' : 'singles'
  )
  const [singlesMode, setSinglesMode] = useState<FeeMode>(initSinglesMode)
  const [singlesAmount, setSinglesAmount] = useState(event.singles_fee?.toString() ?? '')
  const [doublesMode, setDoublesMode] = useState<FeeMode>(initDoublesMode)
  const [doublesAmount, setDoublesAmount] = useState(event.doubles_fee?.toString() ?? '')
  const [accompType, setAccompType] = useState(event.accompaniment_type ?? '')

  const showPayment = eventType === 'practice' && status === 'confirmed'
  const isTournament = eventType === 'tournament'

  function toggleAllDay(val: boolean) {
    if (val) {
      setStartDate(startAt.slice(0, 10))
      setEndDate(endAt.slice(0, 10))
    } else {
      setStartAt(`${startDate}T00:00`)
      setEndAt(`${endDate}T23:59`)
    }
    setIsAllDay(val)
  }

  function handleSubmit() {
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    if (isAllDay && endDate < startDate) { setError('終了日は開始日以降にしてください'); return }
    if (showPayment && !paymentMethod) { setError('決済方法を選択してください'); return }
    if (showPayment && !paymentAmount) { setError('支払い金額を入力してください'); return }
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
    fd.set('status', eventType === 'practice' ? status : 'confirmed')
    fd.set('target', target)
    fd.set('is_all_day', String(isAllDay))
    fd.set('start_at', isAllDay ? startDate : startAt)
    fd.set('end_at', isAllDay ? endDate : endAt)
    fd.set('description', description)

    if (showPayment) {
      fd.set('payment_method', paymentMethod)
      fd.set('payment_amount', paymentAmount)
    }

    if (isTournament) {
      fd.set('venue', venue)
      fd.set('entry_deadline', entryDeadline)
      fd.set('singles_fee_mode', singlesMode)
      if (singlesMode === 'amount') fd.set('singles_fee', singlesAmount)
      if (tournamentScope === 'both') {
        fd.set('doubles_fee_mode', doublesMode)
        if (doublesMode === 'amount') fd.set('doubles_fee', doublesAmount)
      } else {
        fd.set('doubles_fee_mode', 'none')
      }
      fd.set('accompaniment_type', accompType)
    }

    Array.from(fileInputRef.current?.files ?? []).forEach(f => fd.append('attachments', f))

    startTransition(async () => {
      const result = await updateEvent(event.id, fd)
      if (result && 'error' in result) setError(result.error)
    })
  }

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

      {eventType === 'practice' && (
        <div>
          <label className="block text-sm font-semibold text-[#1A3666] mb-2">登録状態</label>
          <div className="flex gap-3">
            {(['provisional', 'confirmed'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  status === s
                    ? s === 'provisional'
                      ? 'bg-orange-50 border-orange-400 text-orange-600'
                      : 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                {s === 'provisional' ? '仮登録' : '確定'}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPayment && (
        <div className="space-y-4 bg-[#F5F8FF] border border-[#D0DCF5] rounded-xl p-4">
          <p className="text-xs font-bold text-[#1A3666]">決済情報</p>
          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
              決済方法 <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            >
              <option value="">選択してください</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">
              支払い金額 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">円</span>
            </div>
          </div>
        </div>
      )}

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

          <div>
            <label className="block text-sm font-semibold text-[#1A3666] mb-1.5">申込締切日</label>
            <input
              type="date"
              value={entryDeadline}
              onChange={e => setEntryDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">この日を過ぎると保護者は参加登録できなくなります</p>
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

      <div>
        <label className="block text-sm font-semibold text-[#1A3666] mb-2">添付ファイル</label>
        {attachments.length > 0 && (
          <div className="mb-2">
            <AttachmentList
              attachments={attachments}
              canDelete={true}
              entityType="event"
              entityId={event.id}
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A3666] file:text-white hover:file:bg-[#2A52A0] file:cursor-pointer"
        />
        <p className="text-xs text-gray-400 mt-1">PDF・画像ファイルを添付できます（複数可）</p>
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href={`/calendar/${event.id}`}
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
          {isPending ? '更新中...' : '更新する'}
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
