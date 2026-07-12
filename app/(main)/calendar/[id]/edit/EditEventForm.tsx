'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateEvent } from '../../actions'
import type { CalendarEvent } from '@/lib/types'

const PAYMENT_METHODS = [
  '口座振替',
  'クレジットカード',
  'コンビニ支払',
  'ATM支払',
  'ネットバンク',
  '電子マネー',
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

export default function EditEventForm({ event, role }: { event: CalendarEvent; role: string }) {
  const targets = role === 'admin' || role === 'coach' ? ALL_TARGETS : MEMBER_TARGETS
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(event.title)
  const [eventType, setEventType] = useState(event.event_type)
  const [status, setStatus] = useState(event.status)
  const [target, setTarget] = useState(event.target)
  const [startAt, setStartAt] = useState(isoToJSTDatetimeLocal(event.start_at))
  const [endAt, setEndAt] = useState(isoToJSTDatetimeLocal(event.end_at))
  const [description, setDescription] = useState(event.description ?? '')
  const [paymentMethod, setPaymentMethod] = useState(event.payment_method ?? '')
  const [paymentAmount, setPaymentAmount] = useState(event.payment_amount?.toString() ?? '')

  const showPayment = eventType === 'practice' && status === 'confirmed'

  function handleSubmit() {
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    if (showPayment && !paymentMethod) { setError('決済方法を選択してください'); return }
    if (showPayment && !paymentAmount) { setError('支払い金額を入力してください'); return }
    setError(null)
    const fd = new FormData()
    fd.set('title', title)
    fd.set('event_type', eventType)
    fd.set('status', eventType === 'practice' ? status : 'confirmed')
    fd.set('target', target)
    fd.set('start_at', startAt)
    fd.set('end_at', endAt)
    fd.set('description', description)
    if (showPayment) {
      fd.set('payment_method', paymentMethod)
      fd.set('payment_amount', paymentAmount)
    }
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
            onChange={e => setEventType(e.target.value as CalendarEvent['event_type'])}
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
            onChange={e => setTarget(e.target.value as CalendarEvent['target'])}
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
